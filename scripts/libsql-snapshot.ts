/**
 * Snapshot consistente de una base libSQL local + manifiesto verificable.
 *
 * USO:
 *   DATABASE_URL=file:/home/admin/raffle/data/raffle.db \
 *   bun run scripts/libsql-snapshot.ts --out /tmp/raffle-snapshot.db
 *
 * Genera:
 *   <out>                    copia consistente de la base
 *   <out>.manifest.json      sha256, tamaño, tablas, conteos y estado de migraciones
 *
 * El snapshot usa `VACUUM INTO`, que produce una copia consistente y compactada
 * incluso con la base en uso (WAL y escrituras concurrentes), sin necesidad de
 * parar la aplicación.
 *
 * Es el respaldo previo a una migración. Para comprobar que la copia llegó
 * completa al destino, usar scripts/libsql-verify.ts.
 *
 * Exit code 0 = OK, 1 = error.
 */

import { createHash } from "node:crypto"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { type Client, createClient } from "@libsql/client"

const SOURCE_URL = process.env.DATABASE_URL ?? process.env.SOURCE_DATABASE_URL

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const OUT = argValue("--out")

const IGNORED_PREFIXES = ["sqlite_", "_litestream"]

async function listTables(client: Client): Promise<string[]> {
  const res = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  )
  return res.rows
    .map((r) => String(r.name))
    .filter((n) => !IGNORED_PREFIXES.some((p) => n.startsWith(p)))
}

async function countRows(client: Client, table: string): Promise<number> {
  const res = await client.execute(`SELECT COUNT(*) AS n FROM "${table}"`)
  return Number(res.rows[0]?.n ?? 0)
}

async function migrationState(client: Client) {
  try {
    const res = await client.execute(
      "SELECT COUNT(*) AS total, MAX(created_at) AS last FROM __drizzle_migrations",
    )
    const last = await client.execute(
      "SELECT hash FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1",
    )
    return {
      count: Number(res.rows[0]?.total ?? 0),
      lastCreatedAt: res.rows[0]?.last != null ? Number(res.rows[0].last) : null,
      lastHash: last.rows[0]?.hash != null ? String(last.rows[0].hash) : null,
    }
  } catch {
    return { count: 0, lastCreatedAt: null, lastHash: null }
  }
}

async function main() {
  if (!SOURCE_URL) {
    console.error("❌ Falta DATABASE_URL (o SOURCE_DATABASE_URL)")
    process.exit(1)
  }
  if (!OUT) {
    console.error("❌ Falta --out <ruta-del-snapshot>")
    process.exit(1)
  }
  if (!SOURCE_URL.startsWith("file:")) {
    console.error(
      `❌ Este script solo hace snapshots de bases locales (file:). Recibí: ${SOURCE_URL.split(":")[0]}:…\n` +
        "   Para copiar desde una base remota, usar una migración por filas.",
    )
    process.exit(1)
  }

  const sourcePath = SOURCE_URL.slice("file:".length)
  const outPath = resolve(OUT)

  const sourceStat = await stat(sourcePath).catch(() => null)
  if (!sourceStat) {
    console.error(`❌ No existe la base de origen: ${sourcePath}`)
    process.exit(1)
  }
  console.log(`📦 Origen: ${sourcePath} (${(sourceStat.size / 1048576).toFixed(1)} MB)`)

  await mkdir(dirname(outPath), { recursive: true })

  const source = createClient({ url: SOURCE_URL })
  try {
    console.log("⏳ VACUUM INTO (copia consistente, no bloquea escrituras)…")
    await source.execute(`VACUUM INTO '${outPath.replace(/'/g, "''")}'`)
  } finally {
    source.close()
  }

  const outStat = await stat(outPath)
  const bytes = await readFile(outPath)
  const sha256 = createHash("sha256").update(bytes).digest("hex")

  const snapshot = createClient({ url: `file:${outPath}` })
  try {
    const integrity = await snapshot.execute("PRAGMA integrity_check")
    const integrityResult = String(integrity.rows[0]?.integrity_check ?? "unknown")

    const tables = await listTables(snapshot)
    const rowCounts: Record<string, number> = {}
    for (const t of tables) rowCounts[t] = await countRows(snapshot, t)

    const manifest = {
      source: sourcePath,
      snapshot: outPath,
      createdAt: new Date().toISOString(),
      sizeBytes: outStat.size,
      sha256,
      integrityCheck: integrityResult,
      tableCount: tables.length,
      rowCounts,
      migrations: await migrationState(snapshot),
    }

    await writeFile(`${outPath}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`)

    console.log(`✅ Snapshot: ${outPath}`)
    console.log(`   ${(outStat.size / 1048576).toFixed(1)} MB · sha256 ${sha256.slice(0, 16)}…`)
    console.log(`   integrity_check: ${integrityResult}`)
    console.log(`   ${tables.length} tablas · ${manifest.migrations.count} migraciones`)
    console.log(`   Manifiesto: ${outPath}.manifest.json`)

    if (integrityResult !== "ok") {
      console.error("❌ integrity_check no devolvió 'ok': el origen puede estar dañado")
      process.exit(1)
    }
  } finally {
    snapshot.close()
  }
}

main().catch((err) => {
  console.error("❌ Falló el snapshot:", err)
  process.exit(1)
})
