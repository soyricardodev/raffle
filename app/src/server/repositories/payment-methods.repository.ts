import { paymentMethods } from "@raffle/shared/db"
import type { PaymentMethod } from "@raffle/shared/validators"
import { and, eq } from "drizzle-orm"
import { getDb, type DbTransaction } from "@/lib/db.server"

export async function listPaymentMethodsByRaffle(raffleId: number, activeOnly = true) {
  const db = getDb()
  const query = db.select().from(paymentMethods).where(eq(paymentMethods.raffleId, raffleId))
  const rows = activeOnly
    ? await query.then((all) => all.filter((r) => r.isActive))
    : await query
  return rows.map((pm) => ({
    method_type: pm.methodType as PaymentMethod,
    account_info: pm.accountInfo,
    is_active: pm.isActive,
    min_tickets: pm.minTickets,
  }))
}

export async function findActivePaymentMethodForRaffle(
  tx: DbTransaction,
  raffleId: number,
  methodType: PaymentMethod,
) {
  const [row] = await tx
    .select()
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.raffleId, raffleId),
        eq(paymentMethods.methodType, methodType),
        eq(paymentMethods.isActive, true),
      ),
    )
    .limit(1)

  if (!row) return null

  return {
    method_type: row.methodType as PaymentMethod,
    account_info: row.accountInfo,
    is_active: row.isActive,
    min_tickets: row.minTickets,
  }
}
