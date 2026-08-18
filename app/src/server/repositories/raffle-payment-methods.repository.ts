import { paymentAccounts, rafflePaymentMethods, rafflePromotions } from "@raffle/shared/db"
import { ValidationError } from "@raffle/shared/errors"
import type { PaymentMethod } from "@raffle/shared/validators"
import { and, asc, eq } from "drizzle-orm"
import { type DbTransaction, getDb } from "@/lib/db.server"

export type ResolvedRafflePaymentMethod = {
  id: number
  account_id: number
  label: string
  method_type: PaymentMethod
  account_info: Record<string, string>
  is_active: boolean
  min_tickets: number | null
  min_reference_length: number | null
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
    .orderBy(asc(paymentAccounts.sortOrder), asc(paymentAccounts.id))

  const filtered = activeOnly ? rows.filter((r) => r.rpm.isActive && r.account.isActive) : rows

  return filtered.map(({ rpm, account }) => ({
    id: rpm.id,
    account_id: account.id,
    label: account.label,
    method_type: account.methodType as PaymentMethod,
    account_info: parseAccountInfoJson(account.accountInfo),
    is_active: rpm.isActive && account.isActive,
    min_tickets: rpm.minTickets,
    min_reference_length: rpm.minReferenceLength,
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
    min_reference_length: row.rpm.minReferenceLength,
  }
}

export async function syncRafflePaymentMethods(
  tx: DbTransaction,
  raffleId: number,
  assignments: Array<{
    account_id: number
    min_tickets?: number | null
    min_reference_length?: number | null
    is_active?: boolean
  }>,
) {
  const existing = await tx
    .select({
      id: rafflePaymentMethods.id,
      accountId: rafflePaymentMethods.accountId,
    })
    .from(rafflePaymentMethods)
    .where(eq(rafflePaymentMethods.raffleId, raffleId))

  const existingByAccountId = new Map(existing.map((row) => [row.accountId, row]))
  const desiredAccountIds = new Set(assignments.map((assignment) => assignment.account_id))

  for (const row of existing) {
    if (desiredAccountIds.has(row.accountId)) continue

    const [linkedPromotion] = await tx
      .select({
        id: rafflePromotions.id,
        name: rafflePromotions.name,
      })
      .from(rafflePromotions)
      .where(
        and(
          eq(rafflePromotions.raffleId, raffleId),
          eq(rafflePromotions.rafflePaymentMethodId, row.id),
          eq(rafflePromotions.isActive, true),
        ),
      )
      .limit(1)

    if (linkedPromotion) {
      const [account] = await tx
        .select({ label: paymentAccounts.label })
        .from(paymentAccounts)
        .where(eq(paymentAccounts.id, row.accountId))
        .limit(1)

      throw new ValidationError(
        `No puedes quitar "${account?.label ?? "este método"}" de la rifa: la promoción "${linkedPromotion.name}" depende de él. Edita o desactiva la promoción primero.`,
      )
    }

    await tx.delete(rafflePaymentMethods).where(eq(rafflePaymentMethods.id, row.id))
  }

  for (const assignment of assignments) {
    const existingRow = existingByAccountId.get(assignment.account_id)
    if (existingRow) {
      await tx
        .update(rafflePaymentMethods)
        .set({
          minTickets: assignment.min_tickets ?? null,
          minReferenceLength: assignment.min_reference_length ?? null,
          isActive: assignment.is_active ?? true,
        })
        .where(eq(rafflePaymentMethods.id, existingRow.id))
      continue
    }

    await tx.insert(rafflePaymentMethods).values({
      raffleId,
      accountId: assignment.account_id,
      minTickets: assignment.min_tickets ?? null,
      minReferenceLength: assignment.min_reference_length ?? null,
      isActive: assignment.is_active ?? true,
    })
  }
}

export async function insertRafflePaymentMethodAssignments(
  tx: DbTransaction,
  raffleId: number,
  assignments: Array<{
    account_id: number
    min_tickets?: number | null
    min_reference_length?: number | null
    is_active?: boolean
  }>,
) {
  for (const a of assignments) {
    await tx.insert(rafflePaymentMethods).values({
      raffleId,
      accountId: a.account_id,
      minTickets: a.min_tickets ?? null,
      minReferenceLength: a.min_reference_length ?? null,
      isActive: a.is_active ?? true,
    })
  }
}
