import { fromCents, raffles } from "@raffle/shared/db"
import { AppError } from "@raffle/shared/errors"
import {
  PLATFORM_TOTAL_TICKETS,
  type CreateRaffleInput,
  type UpdateRaffleInput,
} from "@raffle/shared/validators"
import { and, desc, eq, inArray, like, sql } from "drizzle-orm"
import { getDb, type DbTransaction } from "@/lib/db.server"
import { prizes } from "@raffle/shared/db"
import * as rafflePaymentMethodsRepo from "./raffle-payment-methods.repository"

export type RaffleRow = typeof raffles.$inferSelect

/** Counter + pause fields only — for live availability polls. */
export type RaffleLiveRow = Pick<
  RaffleRow,
  | "id"
  | "status"
  | "totalTickets"
  | "ticketsAvailable"
  | "ticketsReserved"
  | "ticketsSold"
  | "minPurchase"
  | "pauseUntil"
  | "pauseReason"
>

export async function findRaffleLiveById(id: number): Promise<RaffleLiveRow | undefined> {
  const db = getDb()
  const [row] = await db
    .select({
      id: raffles.id,
      status: raffles.status,
      totalTickets: raffles.totalTickets,
      ticketsAvailable: raffles.ticketsAvailable,
      ticketsReserved: raffles.ticketsReserved,
      ticketsSold: raffles.ticketsSold,
      minPurchase: raffles.minPurchase,
      pauseUntil: raffles.pauseUntil,
      pauseReason: raffles.pauseReason,
    })
    .from(raffles)
    .where(eq(raffles.id, id))
    .limit(1)
  return row
}

export async function findRaffleById(
  id: number,
  tx?: DbTransaction
): Promise<RaffleRow | undefined> {
  const db = tx ?? getDb()
  const [row] = await db
    .select()
    .from(raffles)
    .where(eq(raffles.id, id))
    .limit(1)
  return row
}

export async function findRaffleForUpdate(
  tx: DbTransaction,
  id: number
): Promise<RaffleRow | undefined> {
  const [row] = await tx
    .select()
    .from(raffles)
    .where(eq(raffles.id, id))
    .limit(1)
  return row
}

export async function listRaffles(params: {
  status?: string
  limit?: number
  page?: number
}): Promise<RaffleRow[]> {
  const db = getDb()
  const safeLimit =
    params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 10
  const safePage = params.page && params.page > 0 ? params.page : 1
  const offset = (safePage - 1) * safeLimit

  let query = db.select().from(raffles).$dynamic()

  if (params.status && params.status !== "all") {
    const statusList = params.status
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (statusList.length > 0) {
      query = query.where(inArray(raffles.status, statusList))
    }
  }

  return query.orderBy(desc(raffles.createdAt)).limit(safeLimit).offset(offset)
}

export async function listAdminRaffles(params: {
  status?: string
  limit?: number
  page?: number
  search?: string | null
}) {
  const db = getDb()
  const safeLimit =
    params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50
  const safePage = params.page && params.page > 0 ? params.page : 1
  const offset = (safePage - 1) * safeLimit

  const conditions = [sql`1=1`]
  if (params.status && params.status !== "all") {
    const statusList = params.status
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (statusList.length > 0) {
      conditions.push(inArray(raffles.status, statusList))
    }
  }
  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    conditions.push(like(raffles.name, term))
  }

  const whereClause = and(...conditions)

  const [countRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(raffles)
    .where(whereClause)

  const rows = await db
    .select()
    .from(raffles)
    .where(whereClause)
    .orderBy(desc(raffles.createdAt))
    .limit(safeLimit)
    .offset(offset)

  const total = Number(countRow?.total ?? 0)
  return { data: rows, total, hasMore: offset + rows.length < total }
}

export async function findFirstActiveOrPaused(): Promise<
  RaffleRow | undefined
> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(raffles)
    .where(inArray(raffles.status, ["active", "paused"]))
    .orderBy(desc(raffles.createdAt))
    .limit(1)
  return row
}

export async function insertRaffle(
  tx: DbTransaction,
  input: CreateRaffleInput
): Promise<number> {
  const total = PLATFORM_TOTAL_TICKETS
  const [row] = await tx
    .insert(raffles)
    .values({
      name: input.name,
      description: input.description ?? null,
      imageUrl: input.image_url ?? null,
      totalTickets: total,
      priceBsCents: Math.round(input.price_bs * 100),
      priceUsdCents: Math.round(input.price_usd * 100),
      minPurchase: input.min_purchase ?? 1,
      maxPurchase: input.max_purchase ?? 10,
      drawDate: input.draw_date ? new Date(input.draw_date) : null,
      daysForDraw: input.days_for_draw ?? null,
      status: input.status ?? "draft",
      autoPauseEnabled: input.auto_pause_enabled ?? true,
      ticketsAvailable: total,
      ticketsReserved: 0,
      ticketsSold: 0,
    })
    .returning({ id: raffles.id })

  const raffleId = row!.id

  if (input.prizes?.length) {
    for (let i = 0; i < input.prizes.length; i++) {
      const p = input.prizes[i]!
      await tx.insert(prizes).values({
        raffleId,
        name: p.name,
        description: p.description ?? "",
        imageUrl: p.image_url ?? null,
        position: p.position ?? i + 1,
      })
    }
  }

  if (input.payment_method_assignments?.length) {
    await rafflePaymentMethodsRepo.insertRafflePaymentMethodAssignments(
      tx,
      raffleId,
      input.payment_method_assignments.map((a) => ({
        account_id: a.account_id,
        min_tickets: a.min_tickets,
        is_active: a.is_active,
      })),
    )
  }

  return raffleId
}

export async function updateRaffleRow(
  tx: DbTransaction,
  id: number,
  input: UpdateRaffleInput
): Promise<void> {
  const patch: Partial<typeof raffles.$inferInsert> = { updatedAt: new Date() }
  if (input.name !== undefined) patch.name = input.name
  if (input.description !== undefined)
    patch.description = input.description ?? null
  if (input.image_url !== undefined) patch.imageUrl = input.image_url
  if (
    input.total_tickets !== undefined &&
    input.total_tickets !== PLATFORM_TOTAL_TICKETS
  ) {
    throw new AppError(
      "El total de boletos es fijo en la plataforma (10.000)",
      400,
      "RAFFLE_TOTAL_FIXED"
    )
  }
  if (input.price_bs !== undefined)
    patch.priceBsCents = Math.round(input.price_bs * 100)
  if (input.price_usd !== undefined)
    patch.priceUsdCents = Math.round(input.price_usd * 100)
  if (input.min_purchase !== undefined) patch.minPurchase = input.min_purchase
  if (input.max_purchase !== undefined) patch.maxPurchase = input.max_purchase
  if (input.draw_date !== undefined) {
    patch.drawDate = input.draw_date ? new Date(input.draw_date) : null
  }
  if (input.days_for_draw !== undefined) patch.daysForDraw = input.days_for_draw
  if (input.status !== undefined) patch.status = input.status
  if (input.auto_pause_enabled !== undefined)
    patch.autoPauseEnabled = input.auto_pause_enabled

  await tx.update(raffles).set(patch).where(eq(raffles.id, id))
}

export async function deleteRaffle(
  tx: DbTransaction,
  id: number
): Promise<void> {
  await tx.delete(raffles).where(eq(raffles.id, id))
}

export async function countPurchasesForRaffle(
  raffleId: number
): Promise<number> {
  const db = getDb()
  const { purchases } = await import("@raffle/shared/db")
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchases)
    .where(eq(purchases.raffleId, raffleId))
  return Number(row?.count ?? 0)
}

export async function pauseRaffleRow(
  tx: DbTransaction,
  raffleId: number,
  pauseUntil: Date,
  reason: string
): Promise<boolean> {
  const updated = await tx
    .update(raffles)
    .set({
      status: "paused",
      pauseUntil,
      pauseReason: reason,
      updatedAt: new Date(),
    })
    .where(and(eq(raffles.id, raffleId), eq(raffles.status, "active")))
    .returning({ id: raffles.id })
  return updated.length > 0
}

export async function unpauseRaffleRow(
  tx: DbTransaction,
  raffleId: number,
  newStatus: string
): Promise<void> {
  await setRaffleStatusRow(tx, raffleId, newStatus)
}

export async function setRaffleStatusRow(
  tx: DbTransaction,
  raffleId: number,
  status: string,
  options?: { pauseUntil?: Date; pauseReason?: string }
): Promise<void> {
  const patch: Partial<typeof raffles.$inferInsert> = {
    status,
    updatedAt: new Date(),
  }

  if (status === "paused") {
    patch.pauseUntil = options?.pauseUntil ?? null
    patch.pauseReason = options?.pauseReason ?? "manual"
  } else {
    patch.pauseUntil = null
    patch.pauseReason = null
  }

  await tx.update(raffles).set(patch).where(eq(raffles.id, raffleId))
}

export async function finalizeExpiredRaffles(): Promise<number> {
  const db = getDb()
  const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000)
  const updated = await db
    .update(raffles)
    .set({ status: "finished", updatedAt: new Date() })
    .where(
      and(
        inArray(raffles.status, ["active", "paused"]),
        sql`${raffles.drawDate} IS NOT NULL`,
        sql`${raffles.drawDate} <= ${cutoff.getTime()}`
      )
    )
    .returning({ id: raffles.id })
  return updated.length
}

/** Precios en unidades legacy (Bs/USD) para compatibilidad API. */
export function rafflePricesLegacy(row: RaffleRow) {
  return {
    price_bs: fromCents(row.priceBsCents),
    price_usd: fromCents(row.priceUsdCents),
  }
}

export function raffleAvailabilityFromCounters(
  row: Pick<RaffleRow, "totalTickets" | "ticketsAvailable" | "ticketsReserved" | "ticketsSold">,
) {
  const total = row.totalTickets
  const available = row.ticketsAvailable
  const reserved = row.ticketsReserved
  const sold = row.ticketsSold
  const unavailable = reserved + sold
  return {
    total,
    available,
    sold,
    reserved,
    unavailable,
    isFull: unavailable >= total,
  }
}
