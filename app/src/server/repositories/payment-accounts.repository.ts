import { paymentAccounts, rafflePaymentMethods } from "@raffle/shared/db"
import type { PaymentMethod } from "@raffle/shared/validators"
import { parseAccountInfo } from "@raffle/shared/payment-methods"
import { desc, eq, sql } from "drizzle-orm"
import { getDb, type DbTransaction } from "@/lib/db.server"

export type PaymentAccountRow = typeof paymentAccounts.$inferSelect

function mapAccountRow(row: PaymentAccountRow) {
  let accountInfo: Record<string, string> = {}
  try {
    accountInfo = JSON.parse(row.accountInfo) as Record<string, string>
  } catch {
    accountInfo = {}
  }
  return {
    id: row.id,
    label: row.label,
    method_type: row.methodType as PaymentMethod,
    account_info: accountInfo,
    is_active: row.isActive,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

export async function listPaymentAccounts(options?: { activeOnly?: boolean }) {
  const db = getDb()
  const rows = await db
    .select()
    .from(paymentAccounts)
    .orderBy(desc(paymentAccounts.createdAt))

  const filtered = options?.activeOnly ? rows.filter((r) => r.isActive) : rows
  return filtered.map(mapAccountRow)
}

export async function findPaymentAccountById(id: number) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.id, id))
    .limit(1)
  return row ? mapAccountRow(row) : null
}

export async function insertPaymentAccount(
  data: {
    label: string
    methodType: PaymentMethod
    accountInfo: Record<string, string>
    isActive?: boolean
  },
) {
  const db = getDb()
  const normalized = parseAccountInfo(data.methodType, data.accountInfo)
  const [row] = await db
    .insert(paymentAccounts)
    .values({
      label: data.label,
      methodType: data.methodType,
      accountInfo: JSON.stringify(normalized),
      isActive: data.isActive ?? true,
    })
    .returning({ id: paymentAccounts.id })
  return row!.id
}

export async function updatePaymentAccount(
  id: number,
  data: {
    label?: string
    methodType?: PaymentMethod
    accountInfo?: Record<string, string>
    isActive?: boolean
  },
) {
  const db = getDb()
  const existing = await findPaymentAccountById(id)
  if (!existing) return false

  const methodType = data.methodType ?? existing.method_type
  const accountInfo = data.accountInfo
    ? parseAccountInfo(methodType, data.accountInfo)
    : existing.account_info

  await db
    .update(paymentAccounts)
    .set({
      label: data.label ?? existing.label,
      methodType,
      accountInfo: JSON.stringify(accountInfo),
      isActive: data.isActive ?? existing.is_active,
      updatedAt: new Date(),
    })
    .where(eq(paymentAccounts.id, id))

  return true
}

export async function deletePaymentAccount(id: number) {
  const db = getDb()
  const [used] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rafflePaymentMethods)
    .where(eq(rafflePaymentMethods.accountId, id))

  if (Number(used?.count ?? 0) > 0) {
    return { deleted: false as const, reason: "in_use" as const }
  }

  await db.delete(paymentAccounts).where(eq(paymentAccounts.id, id))
  return { deleted: true as const }
}

export async function findAccountsByIds(tx: DbTransaction, ids: number[]) {
  if (ids.length === 0) return []
  const rows = await tx.select().from(paymentAccounts)
  return rows.filter((r) => ids.includes(r.id))
}
