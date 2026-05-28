import { getLogger } from "@/lib/logger"
import { withImmediateTransaction } from "@/lib/db.server"
import {
  RaffleNotFoundError,
  RaffleHasPurchasesError,
  RaffleNotActiveError,
} from "@raffle/shared/errors"
import type {
  CreateRaffleInput,
  UpdateRaffleInput,
} from "@raffle/shared/validators"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { paymentMethods, prizes, purchases, raffles } from "@raffle/shared/db"
import { fromCents } from "@raffle/shared/db"
import * as paymentMethodsRepo from "./repositories/payment-methods.repository"
import * as rafflesRepo from "./repositories/raffles.repository"
import { getDb } from "@/lib/db.server"

const logger = getLogger()

export type EnrichedRaffle = ReturnType<typeof mapRaffleLegacy> & {
  prizes: {
    name: string
    description: string | null
    image_url: string | null
    position: number
  }[]
  payment_methods: Awaited<
    ReturnType<typeof paymentMethodsRepo.listPaymentMethodsByRaffle>
  >
  tickets_sold: number
  tickets_available: number
  tickets_reserved: number
  sold_percentage: string
  days_remaining: number | null
}

function mapRaffleLegacy(
  row: NonNullable<Awaited<ReturnType<typeof rafflesRepo.findRaffleById>>>
) {
  const prices = rafflesRepo.rafflePricesLegacy(row)
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    image_url: row.imageUrl,
    total_tickets: row.totalTickets,
    price_bs: prices.price_bs,
    price_usd: prices.price_usd,
    min_purchase: row.minPurchase,
    max_purchase: row.maxPurchase,
    draw_date: row.drawDate?.toISOString() ?? null,
    days_for_draw: row.daysForDraw,
    status: row.status,
    pause_until: row.pauseUntil?.toISOString() ?? null,
    pause_reason: row.pauseReason,
    auto_pause_enabled: row.autoPauseEnabled ? 1 : 0,
    publish: row.publish ? 1 : 0,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

async function enrichRaffleDetail(
  row: NonNullable<Awaited<ReturnType<typeof rafflesRepo.findRaffleById>>>,
  options?: { includeInactivePaymentMethods?: boolean }
): Promise<EnrichedRaffle> {
  const db = getDb()
  const prizeRows = await db
    .select()
    .from(prizes)
    .where(eq(prizes.raffleId, row.id))
    .orderBy(prizes.position)

  const av = rafflesRepo.raffleAvailabilityFromCounters(row)
  const payMethods = await paymentMethodsRepo.listPaymentMethodsByRaffle(
    row.id,
    !options?.includeInactivePaymentMethods
  )

  return {
    ...mapRaffleLegacy(row),
    prizes: prizeRows.map((p) => ({
      name: p.name,
      description: p.description,
      image_url: p.imageUrl,
      position: p.position,
    })),
    payment_methods: payMethods,
    tickets_sold: av.sold,
    tickets_available: av.available,
    tickets_reserved: av.reserved,
    sold_percentage:
      row.totalTickets > 0
        ? ((av.sold / row.totalTickets) * 100).toFixed(2)
        : "0.00",
    days_remaining: row.drawDate
      ? Math.ceil((row.drawDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  }
}

function mapRaffleListRow(
  r: NonNullable<Awaited<ReturnType<typeof rafflesRepo.findRaffleById>>>
) {
  const av = rafflesRepo.raffleAvailabilityFromCounters(r)
  return {
    ...mapRaffleLegacy(r),
    tickets_sold: av.sold,
    tickets_available: av.available,
    tickets_reserved: av.reserved,
    sold_percentage:
      r.totalTickets > 0
        ? ((av.sold / r.totalTickets) * 100).toFixed(2)
        : "0.00",
  }
}

export async function getAllRaffles(params: {
  status?: string
  limit?: number
  page?: number
}) {
  const list = await rafflesRepo.listRaffles(params)
  return Promise.all(list.map((r) => mapRaffleListRow(r)))
}

export async function listAdminRaffles(params: {
  status?: string
  limit?: number
  page?: number
  search?: string | null
}) {
  const result = await rafflesRepo.listAdminRaffles(params)
  const data = await Promise.all(result.data.map((r) => mapRaffleListRow(r)))
  return { data, total: result.total, hasMore: result.hasMore }
}

export async function getRaffleById(
  id: number,
  options?: { includeInactivePaymentMethods?: boolean }
): Promise<EnrichedRaffle> {
  const row = await rafflesRepo.findRaffleById(id)
  if (!row) throw new RaffleNotFoundError(id)
  return enrichRaffleDetail(row, options)
}

export async function findFirstActiveRaffle(): Promise<EnrichedRaffle | null> {
  const row = await rafflesRepo.findFirstActiveOrPaused()
  if (!row) return null
  return enrichRaffleDetail(row)
}

export async function getFirstActiveRaffle(): Promise<EnrichedRaffle> {
  const raffle = await findFirstActiveRaffle()
  if (!raffle) throw new RaffleNotFoundError("first-active")
  return raffle
}

export async function createRaffle(input: CreateRaffleInput) {
  const raffleId = await withImmediateTransaction((tx) =>
    rafflesRepo.insertRaffle(tx, input)
  )
  logger.info({ raffleId, name: input.name }, "raffle:created")
  return { raffleId }
}

export async function updateRaffle(id: number, input: UpdateRaffleInput) {
  await withImmediateTransaction(async (tx) => {
    const existing = await rafflesRepo.findRaffleForUpdate(tx, id)
    if (!existing) throw new RaffleNotFoundError(id)

    await rafflesRepo.updateRaffleRow(tx, id, input)

    if (input.prizes) {
      await tx.delete(prizes).where(eq(prizes.raffleId, id))
      for (let i = 0; i < input.prizes.length; i++) {
        const p = input.prizes[i]!
        await tx.insert(prizes).values({
          raffleId: id,
          name: p.name,
          description: p.description ?? "",
          imageUrl: p.image_url ?? null,
          position: p.position ?? i + 1,
        })
      }
    }

    if (input.payment_methods) {
      await tx.delete(paymentMethods).where(eq(paymentMethods.raffleId, id))
      for (const pm of input.payment_methods) {
        await tx.insert(paymentMethods).values({
          raffleId: id,
          methodType: pm.method_type,
          accountInfo: JSON.stringify(pm.account_info),
          isActive: pm.is_active ?? true,
          minTickets: pm.min_tickets ?? null,
        })
      }
    }
  })

  logger.info({ raffleId: id }, "raffle:updated")
  return { raffleId: id }
}

export async function deleteRaffle(id: number) {
  const row = await rafflesRepo.findRaffleById(id)
  if (!row) throw new RaffleNotFoundError(id)

  const count = await rafflesRepo.countPurchasesForRaffle(id)
  if (count > 0) throw new RaffleHasPurchasesError(id, count)

  await withImmediateTransaction((tx) => rafflesRepo.deleteRaffle(tx, id))
  logger.info({ raffleId: id, name: row.name }, "raffle:deleted")
  return { deletedId: id, name: row.name }
}

export async function publishRaffle(id: number, publish: boolean) {
  const row = await rafflesRepo.findRaffleById(id)
  if (!row) throw new RaffleNotFoundError(id)
  if (row.status !== "finished") throw new RaffleNotActiveError(id, row.status)

  if (row.publish === publish) {
    return {
      message: `La rifa ya está ${publish ? "" : "des"}publicada`,
      raffleId: id,
    }
  }

  const db = getDb()
  await db
    .update(raffles)
    .set({ publish, updatedAt: new Date() })
    .where(eq(raffles.id, id))

  logger.info({ raffleId: id, publish }, "raffle:published")
  return {
    message: `Rifa ${publish ? "" : "des"}publicada exitosamente`,
    raffleId: id,
  }
}

export async function setAutoPauseEnabled(id: number, enabled: boolean) {
  const db = getDb()
  await db
    .update(raffles)
    .set({ autoPauseEnabled: enabled, updatedAt: new Date() })
    .where(eq(raffles.id, id))
  return { autoPauseEnabled: enabled }
}

export async function getPublishedRaffles(limit: number, page: number) {
  const db = getDb()
  const safeLimit = Math.min(limit ?? 10, 100)
  const safePage = Math.max(page ?? 1, 1)
  const offset = (safePage - 1) * safeLimit

  const rows = await db
    .select()
    .from(raffles)
    .where(and(eq(raffles.publish, true), eq(raffles.status, "finished")))
    .orderBy(desc(raffles.createdAt))
    .limit(safeLimit)
    .offset(offset)

  const enriched = rows.map((r) => {
    const av = rafflesRepo.raffleAvailabilityFromCounters(r)
    return {
      id: r.id,
      name: r.name,
      tickets_sold: av.sold,
      total_tickets: r.totalTickets,
      sold_percentage:
        r.totalTickets > 0
          ? ((av.sold / r.totalTickets) * 100).toFixed(2)
          : "0.00",
    }
  })

  return { raffles: enriched, totalRows: enriched.length }
}

export async function getDashboardStats(raffleId?: number) {
  const db = getDb()

  const [raffleStats] = await db
    .select({
      total_raffles: sql<number>`count(*)`,
      active_raffles: sql<number>`sum(case when ${raffles.status} = 'active' then 1 else 0 end)`,
      finished_raffles: sql<number>`sum(case when ${raffles.status} = 'finished' then 1 else 0 end)`,
    })
    .from(raffles)

  const ticketConditions = raffleId
    ? eq(raffles.id, raffleId)
    : inArray(raffles.status, ["active", "paused"])

  const [ticketStats] = await db
    .select({
      total_tickets: sql<number>`coalesce(sum(${raffles.totalTickets}), 0)`,
      sold_tickets: sql<number>`coalesce(sum(${raffles.ticketsSold}), 0)`,
      reserved_tickets: sql<number>`coalesce(sum(${raffles.ticketsReserved}), 0)`,
    })
    .from(raffles)
    .where(ticketConditions)

  const purchaseWhere = raffleId ? eq(purchases.raffleId, raffleId) : undefined

  const [salesStats] = await db
    .select({
      total_sales: sql<number>`count(*)`,
      pending_sales: sql<number>`sum(case when ${purchases.status} = 'pending' then 1 else 0 end)`,
      approved_sales: sql<number>`sum(case when ${purchases.status} = 'approved' then 1 else 0 end)`,
      total_revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
    })
    .from(purchases)
    .where(purchaseWhere)

  const revenueByMethod = await db
    .select({
      method: purchases.paymentMethod,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
    })
    .from(purchases)
    .where(purchaseWhere)
    .groupBy(purchases.paymentMethod)
    .orderBy(
      sql`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0) desc`
    )

  const [userStats] = await db
    .select({
      total_customers: sql<number>`count(distinct ${purchases.customerPhone})`,
      new_customers: sql<number>`count(distinct case when ${purchases.createdAt} >= (unixepoch('now', '-30 days') * 1000) then ${purchases.customerPhone} end)`,
    })
    .from(purchases)
    .where(purchaseWhere)

  const activeRaffles = await db
    .select({ id: raffles.id, name: raffles.name })
    .from(raffles)
    .where(inArray(raffles.status, ["active", "paused"]))
    .orderBy(desc(raffles.createdAt))

  const sales = salesStats ?? {
    total_sales: 0,
    pending_sales: 0,
    approved_sales: 0,
    total_revenue: 0,
  }

  return {
    raffles: raffleStats ?? {},
    tickets: ticketStats ?? {},
    sales: {
      ...sales,
      total_revenue: fromCents(Number(sales.total_revenue)),
    },
    users: userStats ?? {},
    revenue_by_method: revenueByMethod.map((r) => ({
      method: r.method,
      count: Number(r.count),
      revenue: fromCents(Number(r.revenue)),
    })),
    active_raffles: activeRaffles,
    filtered_raffle_id: raffleId ?? null,
  }
}
