import { paymentAccounts, rafflePaymentMethods } from "@raffle/shared/db"
import type { PaymentMethod } from "@raffle/shared/validators"
import { and, eq } from "drizzle-orm"
import { type DbTransaction, getDb } from "@/lib/db.server"

export type ResolvedRafflePaymentMethod = {
  id: number
  account_id: number
  label: string
  method_type: PaymentMethod
  account_info: Record<string, string>
  is_active: boolean
  min_tickets: number | null
}

function parseAccountInfoJson(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

export async function listPaymentMethodsByRaffle(raffleId: number, activeOnly = true) {
  const db = getDb()
  const rows = await db
    .select({
      rpm: rafflePaymentMethods,
      account: paymentAccounts,
    })
    .from(rafflePaymentMethods)
    .innerJoin(paymentAccounts, eq(rafflePaymentMethods.accountId, paymentAccounts.id))
    .where(eq(rafflePaymentMethods.raffleId, raffleId))

  const filtered = activeOnly ? rows.filter((r) => r.rpm.isActive && r.account.isActive) : rows

  return filtered.map(({ rpm, account }) => ({
    id: rpm.id,
    account_id: account.id,
    label: account.label,
    method_type: account.methodType as PaymentMethod,
    account_info: parseAccountInfoJson(account.accountInfo),
    is_active: rpm.isActive && account.isActive,
    min_tickets: rpm.minTickets,
  }))
}

export async function findActiveRafflePaymentMethodById(
  tx: DbTransaction,
  raffleId: number,
  rafflePaymentMethodId: number,
): Promise<ResolvedRafflePaymentMethod | null> {
  const [row] = await tx
    .select({
      rpm: rafflePaymentMethods,
      account: paymentAccounts,
    })
    .from(rafflePaymentMethods)
    .innerJoin(paymentAccounts, eq(rafflePaymentMethods.accountId, paymentAccounts.id))
    .where(
      and(
        eq(rafflePaymentMethods.id, rafflePaymentMethodId),
        eq(rafflePaymentMethods.raffleId, raffleId),
        eq(rafflePaymentMethods.isActive, true),
        eq(paymentAccounts.isActive, true),
      ),
    )
    .limit(1)

  if (!row) return null

  return {
    id: row.rpm.id,
    account_id: row.account.id,
    label: row.account.label,
    method_type: row.account.methodType as PaymentMethod,
    account_info: parseAccountInfoJson(row.account.accountInfo),
    is_active: true,
    min_tickets: row.rpm.minTickets,
  }
}

export async function syncRafflePaymentMethods(
  tx: DbTransaction,
  raffleId: number,
  assignments: Array<{
    account_id: number
    min_tickets?: number | null
    is_active?: boolean
  }>,
) {
  await tx.delete(rafflePaymentMethods).where(eq(rafflePaymentMethods.raffleId, raffleId))

  for (const a of assignments) {
    await tx.insert(rafflePaymentMethods).values({
      raffleId,
      accountId: a.account_id,
      minTickets: a.min_tickets ?? null,
      isActive: a.is_active ?? true,
    })
  }
}

export async function insertRafflePaymentMethodAssignments(
  tx: DbTransaction,
  raffleId: number,
  assignments: Array<{
    account_id: number
    min_tickets?: number | null
    is_active?: boolean
  }>,
) {
  for (const a of assignments) {
    await tx.insert(rafflePaymentMethods).values({
      raffleId,
      accountId: a.account_id,
      minTickets: a.min_tickets ?? null,
      isActive: a.is_active ?? true,
    })
  }
}
