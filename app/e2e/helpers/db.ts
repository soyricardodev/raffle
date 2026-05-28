import { randomUUID } from "node:crypto"
import { createClient } from "@libsql/client"
import { hashPassword } from "better-auth/crypto"
import { desc, eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import { accounts, raffles, schema, users } from "@raffle/shared/db"
import { e2eEnv } from "./env"

function createE2eDb() {
  if (!e2eEnv.databaseUrl) {
    throw new Error("DATABASE_URL is required for database helpers (file:… or libsql://…)")
  }
  const client = createClient({
    url: e2eEnv.databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })
  return drizzle(client, { schema })
}

/** Removes credential rows so Better Auth sign-up/sign-in can recreate them. */
export async function resetAdminCredentialAccount(): Promise<void> {
  const db = createE2eDb()
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, e2eEnv.adminEmail))
    .limit(1)

  if (!user) return

  await db.delete(accounts).where(eq(accounts.userId, user.id))
}

/** Ensures Better Auth credential account exists for seed admin user. */
export async function ensureAdminCredentialAccount(): Promise<void> {
  const db = createE2eDb()
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, e2eEnv.adminEmail))
    .limit(1)

  if (!user) {
    throw new Error(
      `No admin user for ${e2eEnv.adminEmail}. Run pnpm db:seed with DATABASE_URL=${e2eEnv.databaseUrl}.`,
    )
  }

  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, user.id))
    .limit(1)

  const hash = await hashPassword(e2eEnv.adminPassword)

  if (existing) {
    await db
      .update(accounts)
      .set({ password: hash, accountId: user.id, updatedAt: new Date() })
      .where(eq(accounts.userId, user.id))
    return
  }

  await db.insert(accounts).values({
    id: randomUUID(),
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: hash,
  })
}

export type ActiveRaffle = {
  id: number
  name: string
}

export async function getFirstActiveRaffle(): Promise<ActiveRaffle | null> {
  const db = createE2eDb()
  const [row] = await db
    .select({ id: raffles.id, name: raffles.name })
    .from(raffles)
    .where(eq(raffles.status, "active"))
    .orderBy(desc(raffles.id))
    .limit(1)

  if (!row) return null
  return { id: row.id, name: row.name }
}
