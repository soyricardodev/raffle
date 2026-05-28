import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = fileURLToPath(new URL("../..", import.meta.url))
export const DEFAULT_SQLITE_DB_PATH = join(packageRoot, "data/raffle.db")

let legacyMysqlWarned = false

export function isLibsqlDatabaseUrl(url: string): boolean {
  return (
    url.startsWith("file:") ||
    url.startsWith("libsql:") ||
    url.startsWith("https:") ||
    url.startsWith("http:") ||
    url.startsWith("wss:") ||
    url.startsWith("ws:")
  )
}

/**
 * Resuelve DATABASE_URL para runtime libSQL.
 * En dev/test, ignora mysql:// legacy y usa el SQLite de packages/shared/data.
 */
export function resolveLibsqlDatabaseUrl(rawUrl?: string): string {
  const fromEnv = rawUrl ?? process.env.DATABASE_URL ?? process.env.TARGET_DATABASE_URL

  if (fromEnv && isLibsqlDatabaseUrl(fromEnv)) {
    return fromEnv
  }

  if (fromEnv?.startsWith("mysql:")) {
    const nodeEnv = process.env.NODE_ENV ?? "development"
    if (nodeEnv === "production") {
      throw new Error(
        "DATABASE_URL must be libSQL (file:… or libsql://…), not mysql://. " +
          "Migración: docs/LIBSQL_CUTOVER_RUNBOOK.md",
      )
    }
    if (!legacyMysqlWarned) {
      legacyMysqlWarned = true
      console.warn(
        "[raffle] DATABASE_URL es mysql:// — usando libSQL local por defecto. " +
          `Actualiza app/.env a file:…/packages/shared/data/raffle.db`,
      )
    }
  }

  mkdirSync(dirname(DEFAULT_SQLITE_DB_PATH), { recursive: true })
  return `file:${DEFAULT_SQLITE_DB_PATH}`
}
