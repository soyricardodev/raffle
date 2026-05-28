import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { resetEnvCache } from "@/lib/env"
import { resetDbForTests } from "@/lib/db.server"

const migrationSql = readFileSync(
  join(import.meta.dirname, "../../../packages/shared/drizzle-sqlite/0000_init_libsql_v2.sql"),
  "utf8",
)

/** Base SQLite en archivo temporal aislado por suite de tests. */
export async function setupIsolatedTestDatabase(): Promise<void> {
  const dir = join(tmpdir(), "raffle-vitest")
  mkdirSync(dir, { recursive: true })
  const filePath = join(dir, `test-${randomUUID()}.db`)
  const databaseUrl = `file:${filePath}`
  process.env.DATABASE_URL = databaseUrl
  resetEnvCache()
  resetDbForTests()

  const client = createClient({ url: databaseUrl })
  const statements = migrationSql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean)

  for (const stmt of statements) {
    await client.execute(stmt)
  }
  await client.close()
}
