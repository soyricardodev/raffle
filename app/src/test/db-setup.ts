import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { resetEnvCache } from "@/lib/env"
import { resetDbForTests } from "@/lib/db.server"

const migrationDir = join(import.meta.dirname, "../../../packages/shared/drizzle-sqlite")

function readMigration(name: string) {
  return readFileSync(join(migrationDir, name), "utf8")
}

const migrationSql = [
  readMigration("0000_init_libsql_v2.sql"),
  readMigration("0001_payment_accounts_catalog.sql"),
  readMigration("0002_customers.sql"),
  readMigration("0003_customers_flexible_identity.sql"),
].join("\n--> statement-breakpoint\n")

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
