import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "drizzle-kit"

const packageRoot = fileURLToPath(new URL(".", import.meta.url))
const defaultDbPath = join(packageRoot, "data/raffle.db")
mkdirSync(dirname(defaultDbPath), { recursive: true })
const url = process.env.DATABASE_URL ?? `file:${defaultDbPath}`
const authToken = process.env.DATABASE_AUTH_TOKEN

// El deploy en el VPS apunta esto a las migraciones DEL RELEASE desplegado
// (ruta absoluta), no a las del clone git. Así el artefacto es la única fuente
// de verdad y un clone desactualizado no puede aplicar migraciones viejas.
// Sin la variable se mantiene el comportamiento local de siempre.
const out = process.env.DRIZZLE_MIGRATIONS_DIR ?? "./drizzle-sqlite"

export default defineConfig({
  dialect: url.startsWith("libsql:") || url.includes("turso") ? "turso" : "sqlite",
  schema: "./src/db/sqlite/schema/index.ts",
  out,
  dbCredentials: authToken && !url.startsWith("file:") ? { url, authToken } : { url },
})
