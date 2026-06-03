/**
 * Copia credenciales de email (Resend) del backend legacy al .env de la app v2.
 *
 * USO:
 *   pnpm env:sync-email
 *   bun run scripts/sync-email-env.ts --legacy-env backend-legacy/.env --output app/.env
 *   bun run scripts/sync-email-env.ts --dry-run
 *
 * Busca RESEND_API_KEY en (en orden):
 *   1. --legacy-env
 *   2. LEGACY_ENV / backend-legacy/.env
 *   3. ../raffle-app/backend/.env (layout típico en VPS)
 *   4. --output (ya configurado)
 */

import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { isUsableResendKey, readEnvFile, upsertEnvFile } from "./lib/dotenv"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function parseArgs(argv: string[]) {
  const out = {
    legacyEnv: process.env.LEGACY_ENV ?? "",
    output: join(repoRoot, "app", ".env"),
    dryRun: false,
    disable: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--legacy-env") out.legacyEnv = argv[++i] ?? out.legacyEnv
    else if (arg === "--output") out.output = resolve(argv[++i] ?? out.output)
    else if (arg === "--dry-run") out.dryRun = true
    else if (arg === "--disable") out.disable = true
    else if (arg === "--help" || arg === "-h") {
      console.log(`Uso: bun run scripts/sync-email-env.ts [opciones]

Opciones:
  --legacy-env <path>   .env del backend legacy (default: auto-detect)
  --output <path>       .env destino (default: app/.env)
  --dry-run             Muestra cambios sin escribir
  --disable             Fuerza EMAIL_PROVIDER=noop (desactiva envío)
  --help                Esta ayuda

Atajos:
  pnpm env:sync-email
  LEGACY_ENV=../otro/.env pnpm env:sync-email
`)
      process.exit(0)
    }
  }
  if (!out.output.startsWith("/") && !/^[A-Za-z]:/.test(out.output)) {
    out.output = resolve(repoRoot, out.output)
  }
  return out
}

function resolveLegacyEnv(explicit: string): string | null {
  const candidates = [
    explicit,
    join(repoRoot, "backend-legacy", ".env"),
    join(repoRoot, "..", "raffle-app", "backend", ".env"),
    join(repoRoot, "..", "raffle-app", ".env"),
  ].filter(Boolean)

  for (const path of candidates) {
    if (existsSync(path)) return path
  }
  return null
}

function resolveEmailConfig(args: ReturnType<typeof parseArgs>) {
  const targetBefore = readEnvFile(args.output)
  const legacyPath = resolveLegacyEnv(args.legacyEnv)
  const legacy = legacyPath ? readEnvFile(legacyPath) : {}

  const resendKey =
    (isUsableResendKey(legacy.RESEND_API_KEY) && legacy.RESEND_API_KEY) ||
    (isUsableResendKey(targetBefore.RESEND_API_KEY) && targetBefore.RESEND_API_KEY) ||
    ""

  const brevoKey =
    (legacy.BREVO_API_KEY?.trim() || targetBefore.BREVO_API_KEY?.trim() || "") ?? ""

  let provider: "resend" | "brevo" | "noop" = "noop"
  if (args.disable) {
    provider = "noop"
  } else if (resendKey) {
    provider = "resend"
  } else if (brevoKey) {
    provider = "brevo"
  } else if (targetBefore.EMAIL_PROVIDER === "resend" || targetBefore.EMAIL_PROVIDER === "brevo") {
    provider = targetBefore.EMAIL_PROVIDER
  }

  const updates: Record<string, string> = {
    EMAIL_PROVIDER: provider,
  }
  if (resendKey) updates.RESEND_API_KEY = resendKey
  if (brevoKey) updates.BREVO_API_KEY = brevoKey

  return { legacyPath, resendKey, brevoKey, provider, updates, targetBefore }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const { legacyPath, resendKey, brevoKey, provider, updates, targetBefore } =
    resolveEmailConfig(args)

  console.log("📧 sync-email-env")
  console.log(`   destino: ${args.output}`)
  if (legacyPath) console.log(`   legacy:  ${legacyPath}`)
  else console.log("   legacy:  (no encontrado — usa valores ya presentes en destino)")

  if (args.disable) {
    console.log("   modo:    desactivar envío (noop)")
  } else if (provider === "resend") {
    console.log(`   provider: resend (${resendKey.slice(0, 8)}…)`)
  } else if (provider === "brevo") {
    console.log(`   provider: brevo (${brevoKey.slice(0, 8)}…)`)
  } else {
    console.log("   provider: noop (sin API key usable)")
    console.error("")
    console.error("❌ No hay RESEND_API_KEY ni BREVO_API_KEY.")
    console.error("   Pon RESEND_API_KEY en backend-legacy/.env o pásala con --legacy-env.")
    process.exit(1)
  }

  const preview = Object.entries(updates).map(([key, value]) => {
    const prev = targetBefore[key]
    const masked =
      key.endsWith("_API_KEY") && value.length > 12
        ? `${value.slice(0, 8)}…${value.slice(-4)}`
        : value
    return `   ${key}=${masked}${prev === value ? " (sin cambio)" : prev ? " (actualizado)" : " (nuevo)"}`
  })
  console.log("")
  for (const line of preview) console.log(line)

  if (args.dryRun) {
    console.log("")
    console.log("ℹ️  --dry-run: no se escribió el archivo.")
    return
  }

  const { changed, created } = upsertEnvFile(args.output, updates)
  console.log("")
  if (created) {
    console.log(`✅ Creado ${args.output}`)
  } else if (changed.length === 0) {
    console.log(`✅ ${args.output} ya estaba al día`)
  } else {
    console.log(`✅ Actualizado ${args.output} (${changed.join(", ")})`)
  }
  console.log("   Reinicia `pnpm dev` para aplicar los cambios.")
}

main()
