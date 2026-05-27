import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import mysql from "mysql2/promise"
import { e2eEnv } from "./env"

export async function withPool<T>(fn: (pool: mysql.Pool) => Promise<T>): Promise<T> {
  if (!e2eEnv.databaseUrl) {
    throw new Error("DATABASE_URL is required for database helpers")
  }
  const pool = mysql.createPool({ uri: e2eEnv.databaseUrl, connectionLimit: 2 })
  try {
    return await fn(pool)
  } finally {
    await pool.end()
  }
}

/** Removes credential rows so Better Auth sign-up/sign-in can recreate them. */
export async function resetAdminCredentialAccount(): Promise<void> {
  await withPool(async (pool) => {
    await pool.execute(
      `DELETE FROM account WHERE user_id IN (SELECT id FROM users WHERE email = ?)`,
      [e2eEnv.adminEmail],
    )
  })
}

/** Ensures Better Auth credential account exists for seed admin user. */
export async function ensureAdminCredentialAccount(): Promise<void> {
  await withPool(async (pool) => {
    const [users] = await pool.execute<mysql.RowDataPacket[]>(
      "SELECT id, email FROM users WHERE email = ? LIMIT 1",
      [e2eEnv.adminEmail],
    )
    const user = users[0]
    if (!user) {
      throw new Error(
        `No admin user for ${e2eEnv.adminEmail}. Run scripts/seed.ts against DATABASE_URL.`,
      )
    }

    const [accounts] = await pool.execute<mysql.RowDataPacket[]>(
      `SELECT id FROM account WHERE user_id = ? AND provider_id = 'credential' LIMIT 1`,
      [user.id],
    )

    const hash = await hashPassword(e2eEnv.adminPassword)

    if (accounts.length > 0) {
      await pool.execute(
        `UPDATE account SET password = ?, account_id = ?, updated_at = NOW()
         WHERE user_id = ? AND provider_id = 'credential'`,
        [hash, String(user.id), user.id],
      )
      return
    }

    await pool.execute(
      `INSERT INTO account (id, user_id, account_id, provider_id, password, created_at, updated_at)
       VALUES (?, ?, ?, 'credential', ?, NOW(), NOW())`,
      [randomUUID(), user.id, String(user.id), hash],
    )
  })
}

export type ActiveRaffle = {
  id: number
  name: string
}

export async function getFirstActiveRaffle(): Promise<ActiveRaffle | null> {
  return withPool(async (pool) => {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `SELECT id, name FROM raffles WHERE status = 'active' ORDER BY id DESC LIMIT 1`,
    )
    const row = rows[0]
    if (!row) return null
    return { id: Number(row.id), name: String(row.name) }
  })
}
