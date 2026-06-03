/**
 * Reset the password for the only admin user in the libSQL database.
 *
 * Usage:
 *   pnpm admin:reset-password
 *   RESET_ADMIN_PASSWORD=admin1234 pnpm admin:reset-password
 *   RESET_ADMIN_EMAIL=admin@rifas.com RESET_ADMIN_PASSWORD=admin1234 pnpm admin:reset-password
 */

import { randomUUID } from "node:crypto"
import { accounts, sessions, users } from "@raffle/shared/db"
import { hashPassword } from "better-auth/crypto"
import { and, eq, inArray } from "drizzle-orm"
import { createScriptClient, createScriptDb, resolveDatabaseUrl } from "./lib/db"

const RESET_ADMIN_EMAIL = process.env.RESET_ADMIN_EMAIL
const RESET_ADMIN_PASSWORD = process.env.RESET_ADMIN_PASSWORD ?? "admin123"

type AdminRow = {
  id: string
  username: string
  email: string
  role: string
}

function assertPasswordIsUsable(password: string) {
  if (password.length < 8) {
    throw new Error("RESET_ADMIN_PASSWORD must be at least 8 characters for Better Auth.")
  }
}

async function findAdmin(db: ReturnType<typeof createScriptDb>): Promise<AdminRow> {
  const adminRoles = ["admin", "super_admin"]
  const adminQuery = db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
    })
    .from(users)

  const admins = RESET_ADMIN_EMAIL
    ? await adminQuery.where(
        and(eq(users.email, RESET_ADMIN_EMAIL), inArray(users.role, adminRoles)),
      )
    : await adminQuery.where(inArray(users.role, adminRoles))

  if (admins.length === 0) {
    throw new Error(
      RESET_ADMIN_EMAIL
        ? `No admin found with email ${RESET_ADMIN_EMAIL}.`
        : "No admin users found.",
    )
  }

  if (admins.length > 1) {
    const list = admins.map((admin) => `${admin.email} (${admin.role})`).join(", ")
    throw new Error(`Found more than one admin: ${list}. Set RESET_ADMIN_EMAIL to choose one.`)
  }

  const admin = admins[0]
  if (!admin) {
    throw new Error("No admin users found.")
  }

  return admin
}

async function main() {
  assertPasswordIsUsable(RESET_ADMIN_PASSWORD)

  const url = resolveDatabaseUrl()
  console.log(`Resetting admin password in ${url}`)

  const client = createScriptClient(url)
  await client.execute("PRAGMA busy_timeout = 10000")

  const db = createScriptDb(url)
  const admin = await findAdmin(db)
  const passwordHash = await hashPassword(RESET_ADMIN_PASSWORD)
  const now = new Date()

  const credentials = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, admin.id), eq(accounts.providerId, "credential")))

  if (credentials.length === 0) {
    await db.insert(accounts).values({
      id: randomUUID(),
      userId: admin.id,
      accountId: admin.id,
      providerId: "credential",
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    })
  } else {
    await db
      .update(accounts)
      .set({ password: passwordHash, updatedAt: now })
      .where(and(eq(accounts.userId, admin.id), eq(accounts.providerId, "credential")))
  }

  await db.delete(sessions).where(eq(sessions.userId, admin.id))
  await client.close()

  console.log("Admin password reset complete.")
  console.log(`Email: ${admin.email}`)
  console.log(`Username: ${admin.username}`)
  console.log(`Password: ${RESET_ADMIN_PASSWORD}`)
}

main().catch((error) => {
  console.error("Failed to reset admin password:", error)
  process.exit(1)
})
