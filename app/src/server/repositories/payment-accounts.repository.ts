import { paymentAccounts, rafflePaymentMethods, rafflePromotions, raffles } from "@raffle/shared/db"
import { parseAccountInfo } from "@raffle/shared/payment-methods"
import type { PaymentMethod } from "@raffle/shared/validators"
import { and, desc, eq, inArray } from "drizzle-orm"
import { type DbTransaction, getDb, withImmediateTransaction } from "@/lib/db.server"

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
  const rows = await db.select().from(paymentAccounts).orderBy(desc(paymentAccounts.createdAt))

  const filtered = options?.activeOnly ? rows.filter((r) => r.isActive) : rows
  return filtered.map(mapAccountRow)
}

export async function findPaymentAccountById(id: number) {
  const db = getDb()
  const [row] = await db.select().from(paymentAccounts).where(eq(paymentAccounts.id, id)).limit(1)
  return row ? mapAccountRow(row) : null
}

export async function insertPaymentAccount(data: {
  label: string
  methodType: PaymentMethod
  accountInfo: Record<string, string>
  isActive?: boolean
}) {
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

export async function findPaymentAccountUsage(accountId: number) {
  const db = getDb()
  const assignments = await db
    .select({
      rpmId: rafflePaymentMethods.id,
      raffleId: rafflePaymentMethods.raffleId,
      raffleName: raffles.name,
    })
    .from(rafflePaymentMethods)
    .innerJoin(raffles, eq(rafflePaymentMethods.raffleId, raffles.id))
    .where(eq(rafflePaymentMethods.accountId, accountId))

  const rpmIds = assignments.map((row) => row.rpmId)
  const promotionRows =
    rpmIds.length === 0
      ? []
      : await db
          .select({
            id: rafflePromotions.id,
            name: rafflePromotions.name,
            raffleId: rafflePromotions.raffleId,
            isActive: rafflePromotions.isActive,
          })
          .from(rafflePromotions)
          .where(
            and(
              inArray(rafflePromotions.rafflePaymentMethodId, rpmIds),
              eq(rafflePromotions.isActive, true),
            ),
          )

  const raffleMap = new Map<number, { id: number; name: string }>()
  for (const row of assignments) {
    raffleMap.set(row.raffleId, { id: row.raffleId, name: row.raffleName })
  }

  return {
    raffles: [...raffleMap.values()],
    promotions: promotionRows.map((row) => ({
      id: row.id,
      name: row.name,
      raffle_id: row.raffleId,
      is_active: row.isActive,
    })),
  }
}

export async function forceDeletePaymentAccount(id: number) {
  await withImmediateTransaction(async (tx) => {
    const rpmRows = await tx
      .select({ id: rafflePaymentMethods.id })
      .from(rafflePaymentMethods)
      .where(eq(rafflePaymentMethods.accountId, id))

    const rpmIds = rpmRows.map((row) => row.id)
    if (rpmIds.length > 0) {
      await tx
        .update(rafflePromotions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            inArray(rafflePromotions.rafflePaymentMethodId, rpmIds),
            eq(rafflePromotions.isActive, true),
          ),
        )

      await tx.delete(rafflePaymentMethods).where(eq(rafflePaymentMethods.accountId, id))
    }

    await tx.delete(paymentAccounts).where(eq(paymentAccounts.id, id))
  })
}

export async function deletePaymentAccount(id: number) {
  const db = getDb()
  const usedRows = await db
    .select({ raffleId: rafflePaymentMethods.raffleId })
    .from(rafflePaymentMethods)
    .where(eq(rafflePaymentMethods.accountId, id))

  if (usedRows.length > 0) {
    const raffleIds = [...new Set(usedRows.map((row) => row.raffleId))]
    return { deleted: false as const, reason: "in_use" as const, raffleIds }
  }

  await db.delete(paymentAccounts).where(eq(paymentAccounts.id, id))
  return { deleted: true as const }
}

export async function findAccountsByIds(tx: DbTransaction, ids: number[]) {
  if (ids.length === 0) return []
  const rows = await tx.select().from(paymentAccounts)
  return rows.filter((r) => ids.includes(r.id))
}
