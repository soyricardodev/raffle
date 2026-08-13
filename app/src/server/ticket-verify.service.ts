import { InternalError } from "@raffle/shared/errors"
import {
  normalizePhone,
  purchases,
  purchaseTickets,
  raffles,
  ticketNumberToInt,
} from "@raffle/shared/db"
import {
  normalizeCustomerCi,
  VerifiedTicketRow,
  type VerifyTicketInput,
} from "@raffle/shared/validators"
import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm"
import { getDb } from "@/lib/db.server"
import * as rafflesRepo from "./repositories/raffles.repository"

/**
 * Public verify scopes to one campaign:
 * newest active/paused, else newest finished.
 */
export async function resolvePublicVerifyRaffleId(): Promise<number | null> {
  const current = await rafflesRepo.findFirstActiveOrPaused()
  if (current) return current.id
  const finished = await rafflesRepo.findLatestFinished()
  return finished?.id ?? null
}

function verifySearchConditions(body: VerifyTicketInput): SQL[] {
  const conditions: SQL[] = []

  if (body.phone?.trim()) {
    conditions.push(eq(purchases.customerPhoneNormalized, normalizePhone(body.phone.trim())))
  }
  if (body.ticketNumber?.trim()) {
    conditions.push(
      eq(purchaseTickets.ticketNumber, ticketNumberToInt(body.ticketNumber.trim())),
    )
  }
  if (body.cedula?.trim()) {
    const stored = normalizeCustomerCi(body.cedula)
    conditions.push(
      or(eq(purchases.customerCi, stored), eq(purchases.customerCi, body.cedula.trim()))!,
    )
  }
  if (body.email?.trim()) {
    conditions.push(sql`lower(${purchases.customerEmail}) = lower(${body.email.trim()})`)
  }

  return conditions
}

export async function verifyPublicTickets(
  body: VerifyTicketInput,
): Promise<VerifiedTicketRow[]> {
  const raffleId = await resolvePublicVerifyRaffleId()
  if (raffleId == null) return []

  const conditions = verifySearchConditions(body)
  if (conditions.length === 0) return []

  const db = getDb()
  const rows = await db
    .select({
      ticket_number: purchaseTickets.ticketNumber,
      status: purchaseTickets.status,
      raffle_id: purchaseTickets.raffleId,
      purchase_id: purchaseTickets.purchaseId,
      raffle_name: raffles.name,
      draw_date: raffles.drawDate,
      customer_name: purchases.customerName,
      customer_phone: purchases.customerPhone,
      customer_email: purchases.customerEmail,
      customer_cedula: purchases.customerCi,
      purchase_status: purchases.status,
    })
    .from(purchaseTickets)
    .innerJoin(raffles, eq(purchaseTickets.raffleId, raffles.id))
    .leftJoin(purchases, eq(purchaseTickets.purchaseId, purchases.id))
    .where(
      and(
        or(...conditions)!,
        eq(purchaseTickets.raffleId, raffleId),
        inArray(purchaseTickets.status, ["sold", "reserved"]),
      ),
    )
    .orderBy(purchaseTickets.ticketNumber, raffles.name)

  const mapped = rows.map((r) => ({
    ticket_number: String(r.ticket_number).padStart(4, "0"),
    status: r.status,
    raffle_id: r.raffle_id,
    purchase_id: r.purchase_id,
    raffle_name: r.raffle_name,
    draw_date: r.draw_date == null ? null : String(r.draw_date),
    customer_name: r.customer_name,
    customer_phone: r.customer_phone,
    customer_email: r.customer_email,
    customer_cedula: r.customer_cedula,
    purchase_status: r.purchase_status,
  }))

  const parsed = VerifiedTicketRow.array().safeParse(mapped)
  if (!parsed.success) {
    throw new InternalError("Error al formatear resultados")
  }
  return parsed.data
}
