import { randomUUID } from "node:crypto"
import { mkdirSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { resetDbForTests } from "@/lib/db.server"
import { resetEnvCache } from "@/lib/env"

const migrationDir = join(import.meta.dirname, "../../../packages/shared/drizzle-sqlite")

function readMigration(name: string) {
  return readFileSync(join(migrationDir, name), "utf8")
}

const migrationSql = [
  readMigration("0000_init_libsql_v2.sql"),
  readMigration("0001_payment_accounts_catalog.sql"),
  readMigration("0002_customers.sql"),
  readMigration("0003_customers_flexible_identity.sql"),
  readMigration("0004_raffle_buyer_presence.sql"),
  readMigration("0005_raffle_promotions.sql"),
  readMigration("0006_client_analytics_events.sql"),
  readMigration("0007_rename_purchase_success_analytics.sql"),
  readMigration("0008_payment_reference_min_length.sql"),
  readMigration("0009_purchases_created_id_idx.sql"),
  readMigration("0010_user_preferences.sql"),
  readMigration("0011_phone_normalize_and_auto_full_repair.sql"),
  readMigration("0012_payment_accounts_sort_order.sql"),
  readMigration("0013_customers_venezuela_municipality.sql"),
  readMigration("0014_purchases_payment_payer_name.sql"),
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
