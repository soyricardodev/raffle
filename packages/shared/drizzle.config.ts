import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "drizzle-kit"

const packageRoot = fileURLToPath(new URL(".", import.meta.url))
const defaultDbPath = join(packageRoot, "data/raffle.db")
mkdirSync(dirname(defaultDbPath), { recursive: true })
const url = process.env.DATABASE_URL ?? `file:${defaultDbPath}`
const authToken = process.env.DATABASE_AUTH_TOKEN

export default defineConfig({
  dialect: url.startsWith("libsql:") || url.includes("turso") ? "turso" : "sqlite",
  schema: "./src/db/sqlite/schema/index.ts",
  out: "./drizzle-sqlite",
  dbCredentials: authToken && !url.startsWith("file:") ? { url, authToken } : { url },
})
