import { purchaseTickets, raffles } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import type { DrizzleDB } from "@/lib/db.server"

export type RaffleInvariantReport = {
  raffleId: number
  totalTickets: number
  ticketsAvailable: number
  ticketsReserved: number
  ticketsSold: number
  assignedRows: number
  uniqueTicketNumbers: number
  counterSum: number
}

/** Verifies denormalized counters and unique ticket numbers for a raffle. */
export async function assertRaffleTicketInvariants(
  db: DrizzleDB,
  raffleId: number,
): Promise<RaffleInvariantReport> {
  const [raffle] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1)
  if (!raffle) {
    throw new Error(`Raffle ${raffleId} not found`)
  }

  const ticketRows = await db
    .select({ ticketNumber: purchaseTickets.ticketNumber })
    .from(purchaseTickets)
    .where(eq(purchaseTickets.raffleId, raffleId))

  const uniqueNumbers = new Set(ticketRows.map((r) => r.ticketNumber))
  const counterSum =
    raffle.ticketsAvailable + raffle.ticketsReserved + raffle.ticketsSold

  const report: RaffleInvariantReport = {
    raffleId,
    totalTickets: raffle.totalTickets,
    ticketsAvailable: raffle.ticketsAvailable,
    ticketsReserved: raffle.ticketsReserved,
    ticketsSold: raffle.ticketsSold,
    assignedRows: ticketRows.length,
    uniqueTicketNumbers: uniqueNumbers.size,
    counterSum,
  }

  if (uniqueNumbers.size !== ticketRows.length) {
    throw new Error(
      `Duplicate ticket numbers in raffle ${raffleId}: ${ticketRows.length} rows, ${uniqueNumbers.size} unique`,
    )
  }

  if (counterSum !== raffle.totalTickets) {
    throw new Error(
      `Counter mismatch for raffle ${raffleId}: available+reserved+sold=${counterSum}, total=${raffle.totalTickets}`,
    )
  }

  if (raffle.ticketsAvailable < 0 || raffle.ticketsReserved < 0 || raffle.ticketsSold < 0) {
    throw new Error(`Negative counters for raffle ${raffleId}`)
  }

  if (ticketRows.length > raffle.totalTickets) {
    throw new Error(`Oversold raffle ${raffleId}: ${ticketRows.length} rows > ${raffle.totalTickets}`)
  }

  return report
}
