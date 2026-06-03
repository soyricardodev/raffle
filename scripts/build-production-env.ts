/**
 * Genera .env de producción v2 a partir del backend legacy.
 *
 * USO:
 *   bun run scripts/build-production-env.ts \
 *     --legacy-env /home/admin/raffle-app/backend/.env \
 *     --output /home/admin/raffle/.env
 */

import { randomBytes } from "node:crypto"
import { readFileSync, writeFileSync, existsSync } from "node:fs"

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {
    domain: "yoiberifas.com",
    raffleRoot: "/home/admin/raffle",
    legacyRoot: "/home/admin/raffle-app",
    legacyEnv: "/home/admin/raffle-app/backend/.env",
    output: "/home/admin/raffle/.env",
    regenerateSecrets: "0",
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--legacy-env") out.legacyEnv = argv[++i] ?? out.legacyEnv
    else if (a === "--output") out.output = argv[++i] ?? out.output
    else if (a === "--domain") out.domain = argv[++i] ?? out.domain
    else if (a === "--raffle-root") out.raffleRoot = argv[++i] ?? out.raffleRoot
    else if (a === "--legacy-root") out.legacyRoot = argv[++i] ?? out.legacyRoot
    else if (a === "--regenerate-secrets") out.regenerateSecrets = "1"
  }
  return out
}

function parseDotenv(content: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

function readExistingSecrets(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  return parseDotenv(readFileSync(path, "utf8"))
}

function secret(len = 32): string {
  return randomBytes(len).toString("base64url").slice(0, 44)
}

function mysqlUrl(legacy: Record<string, string>): string {
  const host = legacy.DB_HOST ?? "127.0.0.1"
  const port = legacy.DB_PORT ?? "3306"
  const user = encodeURIComponent(legacy.DB_USER ?? "root")
  const pass = encodeURIComponent(legacy.DB_PASSWORD ?? "")
  const db = legacy.DB_NAME ?? "raffle_db"
  return `mysql://${user}:${pass}@${host}:${port}/${db}`
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const legacyPath = args.legacyEnv
  const outputPath = args.output
  const regen = args.regenerateSecrets === "1"

  if (!existsSync(legacyPath)) {
    console.error(`❌ No existe legacy .env: ${legacyPath}`)
    process.exit(1)
  }

  const legacy = parseDotenv(readFileSync(legacyPath, "utf8"))
  const existing = readExistingSecrets(outputPath)

  const uploadsDir = `${args.legacyRoot}/backend/uploads`
  const dbPath = `${args.raffleRoot}/data/raffle.db`
  const appUrl = `https://${args.domain.replace(/^https?:\/\//, "")}`

  const resendKey = legacy.RESEND_API_KEY ?? existing.RESEND_API_KEY ?? ""
  const emailProvider =
    resendKey && !resendKey.startsWith("re_placeholder")
      ? "resend"
      : (existing.EMAIL_PROVIDER ?? "noop")

  const pick = (key: string, fallback: string) =>
    regen || !existing[key] ? fallback : existing[key]

  const lines: string[] = [
    "# Generado por scripts/build-production-env.ts",
    "",
    "NODE_ENV=production",
    "PORT=3000",
    "LOG_LEVEL=info",
    "",
    `APP_URL=${existing.APP_URL ?? appUrl}`,
    `BETTER_AUTH_URL=${existing.BETTER_AUTH_URL ?? appUrl}`,
    "",
    `DATABASE_URL=${pick("DATABASE_URL", `file:${dbPath}`)}`,
    "",
    `BETTER_AUTH_SECRET=${pick("BETTER_AUTH_SECRET", secret(32))}`,
    "",
    `# Uploads legacy (misma carpeta — URLs /uploads/... siguen válidas)`,
    `UPLOAD_DIR=${uploadsDir}`,
    "",
    `EMAIL_PROVIDER=${emailProvider}`,
  ]

  if (resendKey) lines.push(`RESEND_API_KEY=${resendKey}`)
  if (legacy.BREVO_API_KEY ?? existing.BREVO_API_KEY) {
    lines.push(`BREVO_API_KEY=${legacy.BREVO_API_KEY ?? existing.BREVO_API_KEY}`)
  }

  lines.push(
    "",
    `CRON_SECRET=${pick("CRON_SECRET", secret(24))}`,
    "",
    "# Migración MySQL → SQLite",
    `SOURCE_DATABASE_URL=${mysqlUrl(legacy)}`,
    `TARGET_DATABASE_URL=${pick("TARGET_DATABASE_URL", `file:${dbPath}`)}`,
    `MIGRATE_ADMIN_PASSWORD=${pick("MIGRATE_ADMIN_PASSWORD", secret(16))}`,
    "",
  )

  writeFileSync(outputPath, lines.join("\n"), { mode: 0o600 })
  console.log(`✅ Escrito ${outputPath}`)
  console.log(`   MySQL: ${legacy.DB_HOST ?? "127.0.0.1"}:${legacy.DB_PORT ?? "3306"}/${legacy.DB_NAME ?? "raffle_db"}`)
  console.log(`   Uploads: ${uploadsDir}`)
}

main()
