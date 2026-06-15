import { purchaseTickets } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { getDb, withImmediateTransaction } from "@/lib/db.server"
import { getLogger } from "@/lib/logger"
import * as rafflesRepo from "./repositories/raffles.repository"
import * as ticketsRepo from "./repositories/tickets.repository"

const TICKET_POOL_SIZE = 10000
const logger = getLogger()

/** Genera números candidatos (utilidad admin / tests). No inserta filas — modelo sparse. */
export function generateTicketNumbers(total: number, max = TICKET_POOL_SIZE): string[] {
  if (total > max) {
    throw new Error(`Máximo ${max} tickets (rango 0000-${String(max - 1).padStart(4, "0")})`)
  }

  const selected = new Set<string>()
  while (selected.size < total) {
    const num = Math.floor(Math.random() * max)
    selected.add(String(num).padStart(4, "0"))
  }
  return Array.from(selected)
}

/** @deprecated Pool materializado eliminado en libSQL v2. */
export async function insertTicketPool(
  _raffleId: number,
  _ticketNumbers: string[],
): Promise<number> {
  logger.warn("insertTicketPool is a no-op in sparse ticket model")
  return 0
}

export async function getPurchaseTicketNumbers(purchaseId: number): Promise<string[]> {
  return withImmediateTransaction((tx) => ticketsRepo.getPurchaseTicketNumbers(tx, purchaseId))
}

export async function countAvailableTickets(raffleId: number): Promise<number> {
  const row = await rafflesRepo.findRaffleById(raffleId)
  return row?.ticketsAvailable ?? 0
}

export async function lookupAdminTicketByNumber(
  ticketNumber: string,
  raffleId?: number | null,
) {
  return ticketsRepo.lookupAdminTicketByNumber(ticketNumber, raffleId)
}

export async function releasePurchaseTickets(purchaseId: number): Promise<number> {
  const db = getDb()
  const [pt] = await db
    .select({ raffleId: purchaseTickets.raffleId })
    .from(purchaseTickets)
    .where(eq(purchaseTickets.purchaseId, purchaseId))
    .limit(1)
  if (!pt) return 0

  return withImmediateTransaction((tx) =>
    ticketsRepo.releasePurchaseTickets(tx, purchaseId, pt.raffleId, "pending"),
  )
}
