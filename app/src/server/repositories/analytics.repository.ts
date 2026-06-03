import type { AnalyticsDateRange } from "@raffle/shared/analytics"
import { aggregateLocationMetrics } from "@raffle/shared/analytics"
import {
  fromCents,
  purchaseSuccessAnalyticsEvents,
  purchases,
  raffles,
} from "@raffle/shared/db"
import { and, desc, eq, type SQL, sql } from "drizzle-orm"
import { getDb } from "@/lib/db.server"

export type AnalyticsScope = {
  range: AnalyticsDateRange
  raffleId?: number
}

export type PurchaseSummary = Awaited<ReturnType<typeof getPurchaseSummary>>

const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const

function createdAtRangeFilter(
  column: typeof purchases.createdAt | typeof purchaseSuccessAnalyticsEvents.createdAt,
  range: AnalyticsDateRange,
): SQL[] {
  if (range.mode === "days") {
    return [
      sql`${column} >= (unixepoch('now', '-' || ${range.days} || ' days') * 1000)`,
    ]
  }
  if (range.mode === "range") {
    return [sql`${column} >= ${range.fromMs}`, sql`${column} <= ${range.toMs}`]
  }
  return []
}

function purchaseScopeFilter(scope: AnalyticsScope): SQL | undefined {
  const parts = createdAtRangeFilter(purchases.createdAt, scope.range)
  if (scope.raffleId != null) {
    parts.push(eq(purchases.raffleId, scope.raffleId))
  }
  return parts.length ? and(...parts) : undefined
}

function eventScopeFilter(scope: AnalyticsScope): SQL | undefined {
  const parts = createdAtRangeFilter(purchaseSuccessAnalyticsEvents.createdAt, scope.range)
  return parts.length ? and(...parts) : undefined
}

function previousScopeFilter(scope: AnalyticsScope): SQL | null {
  if (scope.range.mode === "all") return null

  const parts: SQL[] = []

  if (scope.range.mode === "days") {
    parts.push(
      sql`${purchases.createdAt} >= (unixepoch('now', '-' || ${scope.range.days * 2} || ' days') * 1000)`,
    )
    parts.push(
      sql`${purchases.createdAt} < (unixepoch('now', '-' || ${scope.range.days} || ' days') * 1000)`,
    )
  } else {
    const spanMs = scope.range.toMs - scope.range.fromMs
    parts.push(sql`${purchases.createdAt} >= ${scope.range.fromMs - spanMs - 1}`)
    parts.push(sql`${purchases.createdAt} <= ${scope.range.fromMs - 1}`)
  }

  if (scope.raffleId != null) {
    parts.push(eq(purchases.raffleId, scope.raffleId))
  }

  return and(...parts) ?? null
}

export async function listRafflesForAnalytics() {
  const db = getDb()
  return db
    .select({
      id: raffles.id,
      name: raffles.name,
      status: raffles.status,
    })
    .from(raffles)
    .orderBy(desc(raffles.createdAt))
}

export async function getSalesOverTime(scope: AnalyticsScope) {
  const db = getDb()
  const rows = await db
    .select({
      date: sql<string>`date(${purchases.createdAt} / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
    })
    .from(purchases)
    .where(purchaseScopeFilter(scope))
    .groupBy(sql`date(${purchases.createdAt} / 1000, 'unixepoch')`)
    .orderBy(sql`date(${purchases.createdAt} / 1000, 'unixepoch')`)

  return rows.map((r) => ({
    date: r.date,
    count: Number(r.count),
    revenue: fromCents(Number(r.revenue)),
  }))
}

export async function getTopRaffles(scope: AnalyticsScope, limit = 10) {
  const db = getDb()
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100)
  const purchaseFilter = purchaseScopeFilter(scope)

  const rows = await db
    .select({
      id: raffles.id,
      name: raffles.name,
      status: raffles.status,
      total_sales: sql<number>`count(${purchases.id})`,
      total_revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
      ticket_count: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.ticketQuantity} else 0 end), 0)`,
    })
    .from(raffles)
    .leftJoin(
      purchases,
      and(eq(raffles.id, purchases.raffleId), purchaseFilter ?? sql`1=1`),
    )
    .where(scope.raffleId != null ? eq(raffles.id, scope.raffleId) : undefined)
    .groupBy(raffles.id, raffles.name, raffles.status)
    .orderBy(
      sql`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0) desc`,
    )
    .limit(safeLimit)

  return rows
    .filter((r) => Number(r.total_sales) > 0)
    .map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      totalSales: Number(r.total_sales),
      totalRevenue: fromCents(Number(r.total_revenue)),
      ticketCount: Number(r.ticket_count),
    }))
}

export async function getRevenueByMethod(scope: AnalyticsScope) {
  const db = getDb()
  const rows = await db
    .select({
      method: purchases.paymentMethod,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
    })
    .from(purchases)
    .where(purchaseScopeFilter(scope))
    .groupBy(purchases.paymentMethod)
    .orderBy(
      sql`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0) desc`,
    )

  return rows.map((r) => ({
    method: r.method,
    count: Number(r.count),
    revenue: fromCents(Number(r.revenue)),
  }))
}

export async function getStatusDistribution(scope: AnalyticsScope) {
  const db = getDb()
  const rows = await db
    .select({
      status: purchases.status,
      count: sql<number>`count(*)`,
    })
    .from(purchases)
    .where(purchaseScopeFilter(scope))
    .groupBy(purchases.status)
    .orderBy(desc(sql`count(*)`))

  return rows.map((r) => ({
    status: r.status,
    count: Number(r.count),
  }))
}

export async function getPurchaseSummary(scope: AnalyticsScope) {
  const db = getDb()
  const [row] = await db
    .select({
      total_sales: sql<number>`count(*)`,
      approved_sales: sql<number>`sum(case when ${purchases.status} = 'approved' then 1 else 0 end)`,
      pending_sales: sql<number>`sum(case when ${purchases.status} = 'pending' then 1 else 0 end)`,
      rejected_sales: sql<number>`sum(case when ${purchases.status} = 'rejected' then 1 else 0 end)`,
      total_revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
      total_tickets: sql<number>`coalesce(sum(${purchases.ticketQuantity}), 0)`,
      approved_tickets: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.ticketQuantity} else 0 end), 0)`,
      unique_customers: sql<number>`count(distinct ${purchases.customerPhoneNormalized})`,
    })
    .from(purchases)
    .where(purchaseScopeFilter(scope))

  const totalSales = Number(row?.total_sales ?? 0)
  const approvedSales = Number(row?.approved_sales ?? 0)

  return {
    totalSales,
    approvedSales,
    pendingSales: Number(row?.pending_sales ?? 0),
    rejectedSales: Number(row?.rejected_sales ?? 0),
    totalRevenue: fromCents(Number(row?.total_revenue ?? 0)),
    totalTickets: Number(row?.total_tickets ?? 0),
    approvedTickets: Number(row?.approved_tickets ?? 0),
    uniqueCustomers: Number(row?.unique_customers ?? 0),
    approvalRate: totalSales > 0 ? approvedSales / totalSales : 0,
    avgTicketsPerPurchase: totalSales > 0 ? Number(row?.total_tickets ?? 0) / totalSales : 0,
  }
}

export async function getSalesByWeekday(scope: AnalyticsScope) {
  const db = getDb()
  const rows = await db
    .select({
      weekday: sql<number>`cast(strftime('%w', ${purchases.createdAt} / 1000, 'unixepoch') as integer)`,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
    })
    .from(purchases)
    .where(purchaseScopeFilter(scope))
    .groupBy(sql`strftime('%w', ${purchases.createdAt} / 1000, 'unixepoch')`)
    .orderBy(sql`strftime('%w', ${purchases.createdAt} / 1000, 'unixepoch')`)

  const byIndex = new Map(rows.map((r) => [Number(r.weekday), r]))

  return WEEKDAY_LABELS.map((label, index) => {
    const row = byIndex.get(index)
    return {
      weekday: label,
      count: Number(row?.count ?? 0),
      revenue: fromCents(Number(row?.revenue ?? 0)),
    }
  })
}

export async function getSalesByHour(scope: AnalyticsScope) {
  const db = getDb()
  const rows = await db
    .select({
      hour: sql<number>`cast(strftime('%H', ${purchases.createdAt} / 1000, 'unixepoch') as integer)`,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
    })
    .from(purchases)
    .where(purchaseScopeFilter(scope))
    .groupBy(sql`strftime('%H', ${purchases.createdAt} / 1000, 'unixepoch')`)
    .orderBy(sql`strftime('%H', ${purchases.createdAt} / 1000, 'unixepoch')`)

  const byHour = new Map(rows.map((r) => [Number(r.hour), r]))

  return Array.from({ length: 24 }, (_, hour) => {
    const row = byHour.get(hour)
    return {
      hour: `${String(hour).padStart(2, "0")}:00`,
      count: Number(row?.count ?? 0),
      revenue: fromCents(Number(row?.revenue ?? 0)),
    }
  })
}

export async function getCurrencySplit(scope: AnalyticsScope) {
  const db = getDb()
  const rows = await db
    .select({
      currency: purchases.currency,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
    })
    .from(purchases)
    .where(purchaseScopeFilter(scope))
    .groupBy(purchases.currency)
    .orderBy(desc(sql`count(*)`))

  return rows.map((r) => ({
    currency: r.currency,
    count: Number(r.count),
    revenue: fromCents(Number(r.revenue)),
  }))
}

export async function getLocationBreakdown(scope: AnalyticsScope) {
  const db = getDb()
  const rows = await db
    .select({
      location: purchases.customerLocation,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
    })
    .from(purchases)
    .where(purchaseScopeFilter(scope))
    .groupBy(purchases.customerLocation)

  return aggregateLocationMetrics(
    rows.map((r) => ({
      location: r.location,
      count: Number(r.count),
      revenueCents: Number(r.revenue),
    })),
    fromCents,
  )
}

export async function getRepeatCustomerStats(scope: AnalyticsScope) {
  const db = getDb()
  const filter = purchaseScopeFilter(scope)

  const [uniqueRow] = await db
    .select({
      uniqueCustomers: sql<number>`count(distinct ${purchases.customerPhoneNormalized})`,
    })
    .from(purchases)
    .where(filter)

  const repeatRows = await db
    .select({
      purchase_count: sql<number>`count(*)`,
    })
    .from(purchases)
    .where(filter)
    .groupBy(purchases.customerPhoneNormalized)
    .having(sql`count(*) > 1`)

  const repeatBuyers = repeatRows.length
  const repeatPurchases = repeatRows.reduce((sum, r) => sum + Number(r.purchase_count), 0)
  const uniqueCustomers = Number(uniqueRow?.uniqueCustomers ?? 0)

  return {
    uniqueCustomers,
    repeatBuyers,
    repeatPurchases,
    repeatBuyerRate: uniqueCustomers > 0 ? repeatBuyers / uniqueCustomers : 0,
  }
}

export async function getPromotionImpact(scope: AnalyticsScope) {
  const db = getDb()
  const filter = purchaseScopeFilter(scope)

  const rows = await db
    .select({
      with_promotion: sql<number>`case when ${purchases.promotionId} is not null then 1 else 0 end`,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
      tickets: sql<number>`coalesce(sum(${purchases.ticketQuantity}), 0)`,
    })
    .from(purchases)
    .where(filter)
    .groupBy(sql`case when ${purchases.promotionId} is not null then 1 else 0 end`)

  return rows.map((r) => {
    const count = Number(r.count)
    return {
      label: Number(r.with_promotion) === 1 ? "Con promoción" : "Sin promoción",
      count,
      revenue: fromCents(Number(r.revenue)),
      avgTickets: count > 0 ? Number(r.tickets) / count : 0,
    }
  })
}

export async function getPurchaseSuccessFunnel(scope: AnalyticsScope) {
  const db = getDb()
  const rows = await db
    .select({
      eventName: purchaseSuccessAnalyticsEvents.eventName,
      count: sql<number>`count(*)`,
    })
    .from(purchaseSuccessAnalyticsEvents)
    .where(eventScopeFilter(scope))
    .groupBy(purchaseSuccessAnalyticsEvents.eventName)
    .orderBy(desc(sql`count(*)`))

  return rows.map((r) => ({
    event: r.eventName,
    count: Number(r.count),
  }))
}

export async function getRaffleVelocity(scope: AnalyticsScope, limit = 10) {
  const db = getDb()
  const purchaseFilter = purchaseScopeFilter(scope)

  const rows = await db
    .select({
      id: raffles.id,
      name: raffles.name,
      status: raffles.status,
      sales: sql<number>`count(${purchases.id})`,
      tickets: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.ticketQuantity} else 0 end), 0)`,
      revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
      active_days: sql<number>`count(distinct date(${purchases.createdAt} / 1000, 'unixepoch'))`,
    })
    .from(raffles)
    .innerJoin(purchases, and(eq(raffles.id, purchases.raffleId), purchaseFilter ?? sql`1=1`))
    .where(scope.raffleId != null ? eq(raffles.id, scope.raffleId) : undefined)
    .groupBy(raffles.id, raffles.name, raffles.status)
    .orderBy(
      sql`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.ticketQuantity} else 0 end), 0) desc`,
    )
    .limit(Math.min(Math.max(limit, 1), 50))

  return rows.map((r) => {
    const activeDays = Math.max(Number(r.active_days), 1)
    const tickets = Number(r.tickets)
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      sales: Number(r.sales),
      tickets,
      revenue: fromCents(Number(r.revenue)),
      activeDays,
      ticketsPerDay: tickets / activeDays,
      salesPerDay: Number(r.sales) / activeDays,
    }
  })
}

export async function getPeriodComparison(scope: AnalyticsScope, current: PurchaseSummary) {
  const previousFilter = previousScopeFilter(scope)

  if (!previousFilter) {
    return { current, previous: null, delta: null }
  }

  const db = getDb()
  const [prevRow] = await db
    .select({
      total_sales: sql<number>`count(*)`,
      approved_sales: sql<number>`sum(case when ${purchases.status} = 'approved' then 1 else 0 end)`,
      total_revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
      total_tickets: sql<number>`coalesce(sum(${purchases.ticketQuantity}), 0)`,
      unique_customers: sql<number>`count(distinct ${purchases.customerPhoneNormalized})`,
    })
    .from(purchases)
    .where(previousFilter)

  const prevTotalSales = Number(prevRow?.total_sales ?? 0)
  const prevApproved = Number(prevRow?.approved_sales ?? 0)

  const previous = {
    totalSales: prevTotalSales,
    approvedSales: prevApproved,
    totalRevenue: fromCents(Number(prevRow?.total_revenue ?? 0)),
    totalTickets: Number(prevRow?.total_tickets ?? 0),
    uniqueCustomers: Number(prevRow?.unique_customers ?? 0),
    approvalRate: prevTotalSales > 0 ? prevApproved / prevTotalSales : 0,
    avgTicketsPerPurchase:
      prevTotalSales > 0 ? Number(prevRow?.total_tickets ?? 0) / prevTotalSales : 0,
  }

  const pct = (currentVal: number, prevVal: number) =>
    prevVal === 0 ? (currentVal > 0 ? 100 : 0) : ((currentVal - prevVal) / prevVal) * 100

  return {
    current,
    previous,
    delta: {
      totalSalesPct: pct(current.totalSales, previous.totalSales),
      totalRevenuePct: pct(current.totalRevenue, previous.totalRevenue),
      uniqueCustomersPct: pct(current.uniqueCustomers, previous.uniqueCustomers),
      approvalRatePts: (current.approvalRate - previous.approvalRate) * 100,
      avgTicketsPct: pct(current.avgTicketsPerPurchase, previous.avgTicketsPerPurchase),
    },
  }
}
