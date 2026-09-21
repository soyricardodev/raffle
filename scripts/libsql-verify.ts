/**
 * Verifica que una copia de la base libSQL quedó idéntica al origen.
 *
 * USO:
 *   SOURCE_DATABASE_URL=file:/tmp/raffle-snapshot.db \
 *   TARGET_DATABASE_URL=http://user:pass@raffle-libsql:8080 \
 *   bun run scripts/libsql-verify.ts

 * Compara:
 *   - lista de tablas
 *   - conteo de filas por tabla
 *   - estado de migraciones (cantidad, último created_at y último hash)
 *   - PRAGMA integrity_check en el destino
 *
 * Sirve para el corte a Dokploy: si esto pasa, la data está completa; si no,
 * se aborta la migración con producción todavía intacta.
 *
 * Exit code 0 = OK, 1 = hay discrepancias.
 */

import { type Client, createClient } from "@libsql/client"

const SOURCE_URL = process.env.SOURCE_DATABASE_URL
const TARGET_URL = process.env.TARGET_DATABASE_URL

const IGNORED_PREFIXES = ["sqlite_", "_litestream"]

if (!SOURCE_URL || !TARGET_URL) {
  console.error("❌ Faltan SOURCE_DATABASE_URL y/o TARGET_DATABASE_URL")
  process.exit(1)
}

function label(url: string): string {
  if (url.startsWith("file:")) return url
  try {
    // No imprimir credenciales embebidas en la URL.
    const u = new URL(url)
    return `${u.protocol}//${u.host}`
  } catch {
    return url.split(":")[0] + ":…"
  }
}

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

async function migrations(client: Client) {
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
  const source = createClient({ url: SOURCE_URL as string })
  const target = createClient({ url: TARGET_URL as string })
  const problems: string[] = []

  try {
    console.log(`🔎 Origen: ${label(SOURCE_URL as string)}`)
    console.log(`🔎 Destino: ${label(TARGET_URL as string)}`)
    console.log("")

    const integrity = await target.execute("PRAGMA integrity_check")
    const integrityResult = String(integrity.rows[0]?.integrity_check ?? "unknown")
    console.log(`integrity_check (destino): ${integrityResult}`)
    if (integrityResult !== "ok") {
      problems.push(`integrity_check del destino devolvió "${integrityResult}"`)
    }

    const [sourceTables, targetTables] = await Promise.all([listTables(source), listTables(target)])

    const missing = sourceTables.filter((t) => !targetTables.includes(t))
    const extra = targetTables.filter((t) => !sourceTables.includes(t))
    if (missing.length) problems.push(`faltan tablas en destino: ${missing.join(", ")}`)
    if (extra.length) problems.push(`tablas de más en destino: ${extra.join(", ")}`)

    console.log(`\n📊 Conteo de filas (${sourceTables.length} tablas en origen)`)
    let mismatchCount = 0
    for (const table of sourceTables) {
      if (!targetTables.includes(table)) continue
      const [s, t] = await Promise.all([countRows(source, table), countRows(target, table)])
      const ok = s === t
      if (!ok) {
        mismatchCount++
        problems.push(`"${table}": origen ${s} vs destino ${t}`)
      }
      console.log(
        `   ${ok ? "✅" : "❌"} ${table.padEnd(34)} ${String(s).padStart(8)} / ${String(t).padStart(8)}`,
      )
    }

    const [sourceMig, targetMig] = await Promise.all([migrations(source), migrations(target)])
    console.log("\n🗂  Migraciones (__drizzle_migrations)")
    console.log(`   origen : ${sourceMig.count} · último created_at ${sourceMig.lastCreatedAt}`)
    console.log(`   destino: ${targetMig.count} · último created_at ${targetMig.lastCreatedAt}`)
    if (sourceMig.count !== targetMig.count) {
      problems.push(`migraciones: origen ${sourceMig.count} vs destino ${targetMig.count}`)
    }
    if (sourceMig.lastHash !== targetMig.lastHash) {
      problems.push("el último hash de migración aplicada no coincide")
    }

    console.log("")
    if (problems.length) {
      console.error(`❌ ${problems.length} discrepancia(s):`)
      for (const p of problems) console.error(`   - ${p}`)
      if (mismatchCount) {
        console.error(`\n   (${mismatchCount} tabla(s) con conteos distintos)`)
      }
      process.exitCode = 1
      return
    }

    console.log("✅ La copia cuadra: tablas, filas y migraciones coinciden.")
  } finally {
    source.close()
    target.close()
  }
}

main().catch((err) => {
  console.error("❌ Falló la verificación:", err)
  process.exit(1)
})
