import {
  isSqliteUniqueViolation,
  purchases,
  purchaseTickets,
  raffles,
  ticketNumberToInt,
  ticketNumberToString,
} from "@raffle/shared/db"
import { ConcurrentPurchaseError, InsufficientTicketsError } from "@raffle/shared/errors"
import type { TicketStatus } from "@raffle/shared/validators"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import type { DbTransaction } from "@/lib/db.server"
import { getDb } from "@/lib/db.server"
import { pickFreeTicketNumbers, sampleWithoutReplacement } from "@/server/ticket-sampling"

export type AdminTicketLookupRow = {
  ticket_number: string
  ticket_status: string
  raffle_id: number
  raffle_name: string
  raffle_status: string
  draw_date: Date | null
  purchase_id: number
  purchase_status: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  customer_ci: string | null
  purchased_at: Date
}

/** Admin: dueño del boleto en cualquier rifa (activa, pausada o finalizada). */
export async function lookupAdminTicketByNumber(
  ticketNumberRaw: string,
): Promise<AdminTicketLookupRow[]> {
  const ticketNumber = ticketNumberToInt(ticketNumberRaw.trim())
  const db = getDb()

  const rows = await db
    .select({
      ticket_number: purchaseTickets.ticketNumber,
      ticket_status: purchaseTickets.status,
      raffle_id: purchaseTickets.raffleId,
      raffle_name: raffles.name,
      raffle_status: raffles.status,
      draw_date: raffles.drawDate,
      purchase_id: purchaseTickets.purchaseId,
      purchase_status: purchases.status,
      customer_name: purchases.customerName,
      customer_phone: purchases.customerPhone,
      customer_email: purchases.customerEmail,
      customer_ci: purchases.customerCi,
      purchased_at: purchases.createdAt,
    })
    .from(purchaseTickets)
    .innerJoin(raffles, eq(purchaseTickets.raffleId, raffles.id))
    .innerJoin(purchases, eq(purchaseTickets.purchaseId, purchases.id))
    .where(eq(purchaseTickets.ticketNumber, ticketNumber))
    .orderBy(desc(raffles.createdAt))

  const priority = (status: string) => {
    switch (status) {
      case "active":
        return 0
      case "paused":
        return 1
      case "finished":
        return 2
      case "draft":
        return 3
      default:
        return 4
    }
  }

  return rows
    .map((row) => ({
      ticket_number: ticketNumberToString(row.ticket_number),
      ticket_status: row.ticket_status,
      raffle_id: row.raffle_id,
      raffle_name: row.raffle_name,
      raffle_status: row.raffle_status,
      draw_date: row.draw_date,
      purchase_id: row.purchase_id,
      purchase_status: row.purchase_status,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      customer_email: row.customer_email,
      customer_ci: row.customer_ci,
      purchased_at: row.purchased_at,
    }))
    .sort(
      (a, b) =>
        priority(a.raffle_status) - priority(b.raffle_status) ||
        b.purchased_at.getTime() - a.purchased_at.getTime(),
    )
}

async function applyCounterDelta(
  tx: DbTransaction,
  raffleId: number,
  quantity: number,
  ticketStatus: Extract<TicketStatus, "reserved" | "sold">,
): Promise<void> {
  const counterPatch =
    ticketStatus === "reserved"
      ? {
          ticketsAvailable: sql`${raffles.ticketsAvailable} - ${quantity}`,
          ticketsReserved: sql`${raffles.ticketsReserved} + ${quantity}`,
        }
      : {
          ticketsAvailable: sql`${raffles.ticketsAvailable} - ${quantity}`,
          ticketsSold: sql`${raffles.ticketsSold} + ${quantity}`,
        }

  const updated = await tx
    .update(raffles)
    .set({ ...counterPatch, updatedAt: new Date() })
    .where(and(eq(raffles.id, raffleId), sql`${raffles.ticketsAvailable} >= ${quantity}`))
    .returning({ id: raffles.id })

  if (updated.length === 0) {
    throw new ConcurrentPurchaseError()
  }
}

/** Carga números ya asignados en la rifa (sparse). */
export async function loadOccupiedNumbers(
  tx: DbTransaction,
  raffleId: number,
): Promise<Set<number>> {
  const rows = await tx
    .select({ ticketNumber: purchaseTickets.ticketNumber })
    .from(purchaseTickets)
    .where(eq(purchaseTickets.raffleId, raffleId))
  return new Set(rows.map((r) => r.ticketNumber))
}

/**
 * Asigna `quantity` boletos a una compra dentro de una transacción.
 * Actualiza contadores en `raffles` según el estado del boleto.
 */
export async function allocateTicketsToPurchase(
  tx: DbTransaction,
  params: {
    raffleId: number
    purchaseId: number
    quantity: number
    ticketStatus: Extract<TicketStatus, "reserved" | "sold">
    totalTickets: number
    ticketsAvailable: number
  },
): Promise<string[]> {
  const { raffleId, purchaseId, quantity, ticketStatus, totalTickets, ticketsAvailable } = params

  if (ticketsAvailable < quantity) {
    throw new InsufficientTicketsError(ticketsAvailable, quantity)
  }

  const occupied = await loadOccupiedNumbers(tx, raffleId)
  const assigned: number[] = []

  while (assigned.length < quantity) {
    const needed = quantity - assigned.length
    const candidates = pickFreeTicketNumbers(occupied, totalTickets, needed)
    let progressed = false

    for (const ticketNumber of candidates) {
      try {
        await tx.insert(purchaseTickets).values({
          raffleId,
          purchaseId,
          ticketNumber,
          status: ticketStatus,
        })
        assigned.push(ticketNumber)
        occupied.add(ticketNumber)
        progressed = true
        if (assigned.length >= quantity) break
      } catch (error) {
        if (isSqliteUniqueViolation(error)) {
          occupied.add(ticketNumber)
          continue
        }
        throw error
      }
    }

    if (!progressed) {
      throw new ConcurrentPurchaseError()
    }
  }

  await applyCounterDelta(tx, raffleId, quantity, ticketStatus)

  return assigned.map(ticketNumberToString).sort((a, b) => a.localeCompare(b))
}

export async function getPurchaseTicketNumbers(
  tx: DbTransaction,
  purchaseId: number,
): Promise<string[]> {
  const rows = await tx
    .select({ ticketNumber: purchaseTickets.ticketNumber })
    .from(purchaseTickets)
    .where(eq(purchaseTickets.purchaseId, purchaseId))
    .orderBy(asc(purchaseTickets.ticketNumber))

  return rows.map((r) => ticketNumberToString(r.ticketNumber))
}

export async function releasePurchaseTickets(
  tx: DbTransaction,
  purchaseId: number,
  raffleId: number,
  purchaseStatus: "pending" | "approved" | "rejected",
): Promise<number> {
  const rows = await tx
    .select({ status: purchaseTickets.status })
    .from(purchaseTickets)
    .where(eq(purchaseTickets.purchaseId, purchaseId))

  const count = rows.length
  if (count === 0) return 0

  const reservedCount = rows.filter((r) => r.status === "reserved").length
  const soldCount = rows.filter((r) => r.status === "sold").length

  await tx.delete(purchaseTickets).where(eq(purchaseTickets.purchaseId, purchaseId))

  if (purchaseStatus === "approved" || soldCount > 0) {
    await tx
      .update(raffles)
      .set({
        ticketsSold: sql`${raffles.ticketsSold} - ${soldCount}`,
        ticketsAvailable: sql`${raffles.ticketsAvailable} + ${count}`,
        updatedAt: new Date(),
      })
      .where(eq(raffles.id, raffleId))
  } else {
    await tx
      .update(raffles)
      .set({
        ticketsReserved: sql`${raffles.ticketsReserved} - ${reservedCount}`,
        ticketsAvailable: sql`${raffles.ticketsAvailable} + ${count}`,
        updatedAt: new Date(),
      })
      .where(eq(raffles.id, raffleId))
  }

  return count
}

export async function releaseTicketNumbers(
  tx: DbTransaction,
  purchaseId: number,
  raffleId: number,
  numbers: string[],
  purchaseStatus: "pending" | "approved" | "rejected",
): Promise<number> {
  if (numbers.length === 0) return 0

  const ints = numbers.map(ticketNumberToInt)
  const rows = await tx
    .select({ status: purchaseTickets.status })
    .from(purchaseTickets)
    .where(
      and(eq(purchaseTickets.purchaseId, purchaseId), inArray(purchaseTickets.ticketNumber, ints)),
    )

  const reservedCount = rows.filter((r) => r.status === "reserved").length
  const soldCount = rows.filter((r) => r.status === "sold").length
  const count = rows.length

  await tx
    .delete(purchaseTickets)
    .where(
      and(eq(purchaseTickets.purchaseId, purchaseId), inArray(purchaseTickets.ticketNumber, ints)),
    )

  if (purchaseStatus === "approved" || soldCount > 0) {
    await tx
      .update(raffles)
      .set({
        ticketsSold: sql`${raffles.ticketsSold} - ${soldCount}`,
        ticketsAvailable: sql`${raffles.ticketsAvailable} + ${count}`,
        updatedAt: new Date(),
      })
      .where(eq(raffles.id, raffleId))
  } else {
    await tx
      .update(raffles)
      .set({
        ticketsReserved: sql`${raffles.ticketsReserved} - ${reservedCount}`,
        ticketsAvailable: sql`${raffles.ticketsAvailable} + ${count}`,
        updatedAt: new Date(),
      })
      .where(eq(raffles.id, raffleId))
  }

  return count
}

export async function markPurchaseTicketsStatus(
  tx: DbTransaction,
  purchaseId: number,
  raffleId: number,
  fromStatus: "reserved",
  toStatus: "sold",
): Promise<void> {
  const rows = await tx
    .select({ id: purchaseTickets.id })
    .from(purchaseTickets)
    .where(and(eq(purchaseTickets.purchaseId, purchaseId), eq(purchaseTickets.status, fromStatus)))

  const count = rows.length
  if (count === 0) return

  await tx
    .update(purchaseTickets)
    .set({ status: toStatus, updatedAt: new Date() })
    .where(and(eq(purchaseTickets.purchaseId, purchaseId), eq(purchaseTickets.status, fromStatus)))

  await tx
    .update(raffles)
    .set({
      ticketsReserved: sql`${raffles.ticketsReserved} - ${count}`,
      ticketsSold: sql`${raffles.ticketsSold} + ${count}`,
      updatedAt: new Date(),
    })
    .where(eq(raffles.id, raffleId))
}

export async function countTicketsForPurchase(
  tx: DbTransaction,
  purchaseId: number,
): Promise<number> {
  const [row] = await tx
    .select({ count: sql<number>`count(*)` })
    .from(purchaseTickets)
    .where(eq(purchaseTickets.purchaseId, purchaseId))
  return Number(row?.count ?? 0)
}

export async function pickRandomTicketsFromPurchase(
  tx: DbTransaction,
  purchaseId: number,
  quantity: number,
): Promise<string[]> {
  const all = await getPurchaseTicketNumbers(tx, purchaseId)
  return sampleWithoutReplacement(all, quantity)
}
