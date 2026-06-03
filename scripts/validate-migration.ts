/**
 * Valida que la migración MySQL → libSQL conservó los datos esperados.
 *
 * USO:
 *   SOURCE_DATABASE_URL=mysql://... TARGET_DATABASE_URL=file:./data/raffle.db bun run scripts/validate-migration.ts
 *
 * Opcional (comprueba que existan archivos en disco):
 *   UPLOAD_DIR=/opt/raffle/uploads bun run scripts/validate-migration.ts
 *
 * Exit code 0 = OK, 1 = hay discrepancias.
 */

import { access } from "node:fs/promises"
import path from "node:path"
import { createClient } from "@libsql/client"
import {
  normalizeLegacyAccountInfo,
  parseRawAccountInfo,
  stableAccountInfoKey,
  type PaymentMethod,
} from "@raffle/shared/payment-methods"
import mysql from "mysql2/promise"

const SOURCE_URL = process.env.SOURCE_DATABASE_URL ?? process.env.LEGACY_DATABASE_URL
const TARGET_URL = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL
const UPLOAD_DIR = process.env.UPLOAD_DIR

if (!SOURCE_URL || !TARGET_URL) {
  console.error("❌ Set SOURCE_DATABASE_URL (MySQL) and TARGET_DATABASE_URL (libSQL)")
  process.exit(1)
}

type CheckResult = {
  name: string
  ok: boolean
  mysql?: number | string
  sqlite?: number | string
  note?: string
}

async function mysqlScalar(conn: mysql.Connection, sql: string): Promise<number> {
  const [rows] = await conn.execute(sql)
  const row = (rows as Record<string, unknown>[])[0]
  const val = Object.values(row ?? {})[0]
  return Number(val ?? 0)
}

async function libsqlScalar(client: ReturnType<typeof createClient>, sql: string): Promise<number> {
  const result = await client.execute(sql)
  const val = result.rows[0]?.[0]
  return Number(val ?? 0)
}

async function fileExists(relativeUrl: string): Promise<boolean> {
  if (!UPLOAD_DIR || !relativeUrl.startsWith("/uploads/")) return true
  const rel = relativeUrl.replace(/^\/uploads\//, "")
  const full = path.join(UPLOAD_DIR, rel)
  try {
    await access(full)
    return true
  } catch {
    return false
  }
}

async function main() {
  const mysqlConn = await mysql.createConnection(SOURCE_URL)
  const libsql = createClient({
    url: TARGET_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })

  console.log("🔍 Validando migración MySQL → libSQL\n")

  const checks: CheckResult[] = []

  const pairs: Array<{ name: string; mysqlSql: string; sqliteSql: string; note?: string }> = [
    {
      name: "admins (users)",
      mysqlSql: "SELECT COUNT(*) FROM users",
      sqliteSql: "SELECT COUNT(*) FROM users",
    },
    {
      name: "rifas",
      mysqlSql: "SELECT COUNT(*) FROM raffles",
      sqliteSql: "SELECT COUNT(*) FROM raffles",
    },
    {
      name: "premios",
      mysqlSql: "SELECT COUNT(*) FROM prizes",
      sqliteSql: "SELECT COUNT(*) FROM prizes",
    },
    {
      name: "compras",
      mysqlSql: "SELECT COUNT(*) FROM purchases",
      sqliteSql: "SELECT COUNT(*) FROM purchases",
    },
    {
      name: "métodos de pago (legacy → raffle_payment_methods)",
      mysqlSql: "SELECT COUNT(*) FROM payment_methods",
      sqliteSql: "SELECT COUNT(*) FROM raffle_payment_methods",
    },
    {
      name: "logs de email",
      mysqlSql: "SELECT COUNT(*) FROM email_logs",
      sqliteSql: "SELECT COUNT(*) FROM email_logs",
    },
    {
      name: "boletos asignados (reserved/sold → purchase_tickets)",
      mysqlSql:
        "SELECT COUNT(*) FROM tickets WHERE status IN ('reserved', 'sold') AND purchase_id IS NOT NULL",
      sqliteSql: "SELECT COUNT(*) FROM purchase_tickets",
      note: "Solo se migran boletos reserved/sold con compra",
    },
    {
      name: "compras con comprobante",
      mysqlSql:
        "SELECT COUNT(*) FROM purchases WHERE payment_proof_url IS NOT NULL AND payment_proof_url != ''",
      sqliteSql:
        "SELECT COUNT(*) FROM purchases WHERE payment_proof_url IS NOT NULL AND payment_proof_url != ''",
    },
    {
      name: "rifas con imagen",
      mysqlSql: "SELECT COUNT(*) FROM raffles WHERE image_url IS NOT NULL AND image_url != ''",
      sqliteSql: "SELECT COUNT(*) FROM raffles WHERE image_url IS NOT NULL AND image_url != ''",
    },
  ]

  for (const p of pairs) {
    const m = await mysqlScalar(mysqlConn, p.mysqlSql)
    const s = await libsqlScalar(libsql, p.sqliteSql)
    checks.push({
      name: p.name,
      mysql: m,
      sqlite: s,
      ok: m === s,
      note: p.note,
    })
  }

  // Invariante contadores por rifa
  const badCounters = await libsql.execute(`
    SELECT COUNT(*) FROM raffles
    WHERE tickets_available + tickets_reserved + tickets_sold != total_tickets
  `)
  const badCount = Number(badCounters.rows[0]?.[0] ?? 0)
  checks.push({
    name: "contadores rifa (available+reserved+sold=total)",
    sqlite: badCount,
    ok: badCount === 0,
    note: badCount > 0 ? `${badCount} rifa(s) con contadores incoherentes` : undefined,
  })

  // Duplicados de boleto
  const dupes = await libsql.execute(`
    SELECT COUNT(*) FROM (
      SELECT raffle_id, ticket_number FROM purchase_tickets
      GROUP BY raffle_id, ticket_number HAVING COUNT(*) > 1
    )
  `)
  const dupeCount = Number(dupes.rows[0]?.[0] ?? 0)
  checks.push({
    name: "sin boletos duplicados",
    sqlite: dupeCount,
    ok: dupeCount === 0,
    note: dupeCount > 0 ? `${dupeCount} número(s) duplicado(s)` : undefined,
  })

  // site_config → app_settings
  const mysqlConfig = await mysqlScalar(mysqlConn, "SELECT COUNT(*) FROM site_config")
  const sqliteSettings = await libsqlScalar(libsql, "SELECT COUNT(*) FROM app_settings")
  checks.push({
    name: "config sitio (site_config → app_settings)",
    mysql: mysqlConfig,
    sqlite: sqliteSettings,
    ok: mysqlConfig === 0 ? sqliteSettings === 0 : sqliteSettings >= 1,
    note: "SQLite debe tener al menos 1 fila app_settings si legacy tenía config",
  })

  // Métodos de pago: catálogo deduplicado y cédula pago móvil
  const legacyPayCount = await mysqlScalar(mysqlConn, "SELECT COUNT(*) FROM payment_methods")
  const catalogCount = await libsqlScalar(libsql, "SELECT COUNT(*) FROM payment_accounts")
  checks.push({
    name: "catálogo payment_accounts ≤ legacy",
    mysql: legacyPayCount,
    sqlite: catalogCount,
    ok: catalogCount <= legacyPayCount,
    note:
      catalogCount > legacyPayCount
        ? "Hay más cuentas en catálogo que filas legacy — ejecuta db:repair:payment-accounts"
        : undefined,
  })

  const payAccountRows = await libsql.execute(
    "SELECT id, method_type, account_info FROM payment_accounts",
  )
  let pagoMovilMissingCedula = 0
  const stableKeyGroups = new Map<string, number>()
  for (const row of payAccountRows.rows) {
    const methodType = String(row[1]) as PaymentMethod
    const raw = parseRawAccountInfo(String(row[2] ?? "{}"))
    const normalized = normalizeLegacyAccountInfo(methodType, raw)
    if (methodType === "pago_movil" && (!normalized.cedula_type || !normalized.cedula_number)) {
      pagoMovilMissingCedula++
    }
    const key = stableAccountInfoKey(methodType, normalized)
    stableKeyGroups.set(key, (stableKeyGroups.get(key) ?? 0) + 1)
  }
  const logicalDuplicateGroups = [...stableKeyGroups.values()].filter((n) => n > 1).length

  checks.push({
    name: "pago móvil con cédula completa",
    sqlite: pagoMovilMissingCedula,
    ok: pagoMovilMissingCedula === 0,
    note:
      pagoMovilMissingCedula > 0
        ? `${pagoMovilMissingCedula} cuenta(s) sin cedula_type/cedula_number — ejecuta db:repair:payment-accounts`
        : undefined,
  })
  checks.push({
    name: "sin duplicados lógicos en catálogo",
    sqlite: logicalDuplicateGroups,
    ok: logicalDuplicateGroups === 0,
    note:
      logicalDuplicateGroups > 0
        ? `${logicalDuplicateGroups} grupo(s) con cuentas equivalentes — ejecuta db:repair:payment-accounts`
        : undefined,
  })

  // Muestra de URLs de archivos (opcional)
  if (UPLOAD_DIR) {
    const [proofRows] = await mysqlConn.execute(
      "SELECT payment_proof_url FROM purchases WHERE payment_proof_url IS NOT NULL AND payment_proof_url != '' LIMIT 20",
    )
    let missing = 0
    for (const row of proofRows as Record<string, unknown>[]) {
      const url = String(row.payment_proof_url)
      if (!(await fileExists(url))) missing++
    }
    checks.push({
      name: "muestra comprobantes en disco (20 URLs)",
      sqlite: `${20 - missing}/20`,
      ok: missing === 0,
      note: missing > 0 ? `${missing} archivo(s) no encontrados en ${UPLOAD_DIR}` : undefined,
    })

    const [imageRows] = await mysqlConn.execute(
      "SELECT image_url FROM raffles WHERE image_url IS NOT NULL AND image_url != '' LIMIT 10",
    )
    let missingImages = 0
    for (const row of imageRows as Record<string, unknown>[]) {
      if (!(await fileExists(String(row.image_url)))) missingImages++
    }
    checks.push({
      name: "muestra imágenes rifa en disco (10 URLs)",
      sqlite: `${10 - missingImages}/10`,
      ok: missingImages === 0,
      note:
        missingImages > 0
          ? `${missingImages} imagen(es) no encontrada(s) — copia uploads/ del legacy`
          : undefined,
    })
  }

  await mysqlConn.end()

  // Reporte
  let failed = 0
  const pad = (s: string, n: number) => s.padEnd(n)
  console.log(`${pad("CHECK", 42)} ${pad("MYSQL", 8)} ${pad("SQLITE", 10)} OK`)
  console.log("-".repeat(72))

  for (const c of checks) {
    const status = c.ok ? "✅" : "❌"
    if (!c.ok) failed++
    const mysqlCol = c.mysql !== undefined ? String(c.mysql) : "—"
    const sqliteCol = c.sqlite !== undefined ? String(c.sqlite) : "—"
    console.log(`${pad(c.name, 42)} ${pad(mysqlCol, 8)} ${pad(sqliteCol, 10)} ${status}`)
    if (c.note) console.log(`   ↳ ${c.note}`)
  }

  console.log("")
  if (failed === 0) {
    console.log("✅ Validación OK — listo para cutover")
    if (!UPLOAD_DIR) {
      console.log("   Tip: re-ejecuta con UPLOAD_DIR=/opt/raffle/uploads para verificar archivos")
    }
    process.exit(0)
  }

  console.error(`❌ ${failed} check(s) fallaron — revisa antes del cutover`)
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
