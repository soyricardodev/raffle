import {
  emailRecipientVerifications,
  emailSuppressions,
  purchases,
  purchaseTickets,
  raffles,
} from "@raffle/shared/db"
import { and, asc, eq, inArray, sql } from "drizzle-orm"
import { getDb } from "@/lib/db.server"

/** A purchase that still owes the customer an approval notification. */
export type PendingNotificationPurchase = {
  purchaseId: number
  email: string
  customerName: string
  paymentReference: string | null
  ticketQuantity: number
  totalAmountCents: number
  verificationState: string | null
  suppressionReason: string | null
}

/**
 * Purchases of a raffle that never produced a delivered status_update. The queue is
 * per purchase on purpose: collapsing duplicates per recipient belongs to the
 * dispatch service, so the raw ledger stays auditable.
 */
export async function listPendingNotificationPurchases(
  raffleId: number,
): Promise<Array<PendingNotificationPurchase>> {
  const rows = await getDb()
    .select({
      purchaseId: purchases.id,
      email: purchases.customerEmail,
      customerName: purchases.customerName,
      paymentReference: purchases.paymentReference,
      ticketQuantity: purchases.ticketQuantity,
      totalAmountCents: purchases.totalAmountCents,
      verificationState: emailRecipientVerifications.state,
      suppressionReason: emailSuppressions.reason,
    })
    .from(purchases)
    .leftJoin(
      emailRecipientVerifications,
      eq(sql`lower(trim(${purchases.customerEmail}))`, emailRecipientVerifications.email),
    )
    .leftJoin(
      emailSuppressions,
      eq(sql`lower(trim(${purchases.customerEmail}))`, emailSuppressions.email),
    )
    .where(
      and(
        eq(purchases.raffleId, raffleId),
        eq(purchases.status, "approved"),
        sql`not exists (
          select 1 from email_logs delivered
          where delivered.purchase_id = ${purchases.id}
            and delivered.email_type = 'status_update'
            and delivered.status = 'sent'
        )`,
      ),
    )
    .orderBy(asc(purchases.id))

  return rows
    .filter((row) => Boolean(row.email?.trim()))
    .map((row) => ({
      purchaseId: row.purchaseId,
      email: String(row.email).trim().toLowerCase(),
      customerName: row.customerName,
      paymentReference: row.paymentReference,
      ticketQuantity: row.ticketQuantity,
      totalAmountCents: row.totalAmountCents,
      verificationState: row.verificationState ?? null,
      suppressionReason: row.suppressionReason ?? null,
    }))
}

/** Raffles a dispatch tick may drain: only the ones currently active. */
export async function listActiveRaffleIds(): Promise<Array<number>> {
  const rows = await getDb()
    .select({ id: raffles.id })
    .from(raffles)
    .where(eq(raffles.status, "active"))
    .orderBy(asc(raffles.id))

  return rows.map((row) => row.id)
}

/** Ticket numbers keyed by purchase id, used to build the consolidated email. */
export async function listTicketNumbersByPurchase(
  purchaseIds: Array<number>,
): Promise<Map<number, Array<string>>> {
  const grouped = new Map<number, Array<string>>()
  if (purchaseIds.length === 0) return grouped

  const rows = await getDb()
    .select({
      purchaseId: purchaseTickets.purchaseId,
      ticketNumber: purchaseTickets.ticketNumber,
    })
    .from(purchaseTickets)
    .where(inArray(purchaseTickets.purchaseId, purchaseIds))
    .orderBy(asc(purchaseTickets.purchaseId), asc(purchaseTickets.ticketNumber))

  for (const row of rows) {
    if (row.purchaseId == null) continue
    const list = grouped.get(row.purchaseId) ?? []
    list.push(String(row.ticketNumber))
    grouped.set(row.purchaseId, list)
  }
  return grouped
}
