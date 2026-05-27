import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const e2eDir = path.dirname(fileURLToPath(import.meta.url))

/** Load app/.env for local E2E without overriding existing env. */
function loadDotEnv() {
  const envPath = path.join(e2eDir, "..", "..", ".env")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadDotEnv()

const e2ePort = process.env.E2E_PORT ?? "3100"

export const e2eEnv = {
  port: e2ePort,
  baseUrl: process.env.E2E_BASE_URL ?? `http://localhost:${e2ePort}`,
  databaseUrl: process.env.DATABASE_URL ?? "",
  adminEmail: process.env.E2E_ADMIN_EMAIL ?? "admin@rifas.com",
  adminPassword: process.env.E2E_ADMIN_PASSWORD ?? "admin123",
  adminStoragePath: path.join(e2eDir, "..", ".auth", "admin.json"),
}

export function hasDatabase(): boolean {
  return Boolean(e2eEnv.databaseUrl.trim())
}
