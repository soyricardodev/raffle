import { purchases, raffles } from "@raffle/shared/db"
import { fromCents } from "@raffle/shared/db"
import { and, desc, eq, sql, type SQL } from "drizzle-orm"
import { getDb } from "@/lib/db.server"

export type AnalyticsScope = {
  days?: number
  raffleId?: number
}

function purchaseTimeFilter(days: number, raffleId?: number): SQL {
  const parts: SQL[] = [
    sql`${purchases.createdAt} >= (unixepoch('now', '-' || ${days} || ' days') * 1000)`,
  ]
  if (raffleId != null) {
    parts.push(eq(purchases.raffleId, raffleId))
  }
  return and(...parts)!
}

export async function getSalesOverTime(days = 30, raffleId?: number) {
  const db = getDb()
  const rows = await db
    .select({
      date: sql<string>`date(${purchases.createdAt} / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
    })
    .from(purchases)
    .where(purchaseTimeFilter(days, raffleId))
    .groupBy(sql`date(${purchases.createdAt} / 1000, 'unixepoch')`)
    .orderBy(sql`date(${purchases.createdAt} / 1000, 'unixepoch')`)

  return rows.map((r) => ({
    date: r.date,
    count: Number(r.count),
    revenue: fromCents(Number(r.revenue)),
  }))
}

export async function getTopRaffles(limit = 5, raffleId?: number) {
  const db = getDb()
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100)

  const raffleFilter = raffleId != null ? eq(raffles.id, raffleId) : undefined

  const rows = await db
    .select({
      id: raffles.id,
      name: raffles.name,
      total_sales: sql<number>`count(${purchases.id})`,
      total_revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
      ticket_count: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.ticketQuantity} else 0 end), 0)`,
    })
    .from(raffles)
    .leftJoin(purchases, eq(raffles.id, purchases.raffleId))
    .where(raffleFilter)
    .groupBy(raffles.id, raffles.name)
    .orderBy(sql`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0) desc`)
    .limit(safeLimit)

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    totalSales: Number(r.total_sales),
    totalRevenue: fromCents(Number(r.total_revenue)),
    ticketCount: Number(r.ticket_count),
  }))
}

export async function getRevenueByMethod(days = 30, raffleId?: number) {
  const db = getDb()
  const rows = await db
    .select({
      method: purchases.paymentMethod,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0)`,
    })
    .from(purchases)
    .where(purchaseTimeFilter(days, raffleId))
    .groupBy(purchases.paymentMethod)
    .orderBy(sql`coalesce(sum(case when ${purchases.status} = 'approved' then ${purchases.totalAmountCents} else 0 end), 0) desc`)

  return rows.map((r) => ({
    method: r.method,
    count: Number(r.count),
    revenue: fromCents(Number(r.revenue)),
  }))
}

export async function getStatusDistribution(days = 30, raffleId?: number) {
  const db = getDb()
  const rows = await db
    .select({
      status: purchases.status,
      count: sql<number>`count(*)`,
    })
    .from(purchases)
    .where(purchaseTimeFilter(days, raffleId))
    .groupBy(purchases.status)
    .orderBy(desc(sql`count(*)`))

  return rows.map((r) => ({
    status: r.status,
    count: Number(r.count),
  }))
}

export async function getTotalApprovedRevenue(raffleId?: number) {
  const db = getDb()
  const conditions = [eq(purchases.status, "approved")]
  if (raffleId != null) {
    conditions.push(eq(purchases.raffleId, raffleId))
  }
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${purchases.totalAmountCents}), 0)`,
    })
    .from(purchases)
    .where(and(...conditions))
  return fromCents(Number(row?.total ?? 0))
}
