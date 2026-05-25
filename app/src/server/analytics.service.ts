import { getPool } from "@/lib/db.server"

export type SalesOverTime = {
  date: string
  count: number
  revenue: number
}[]

export type TopRaffle = {
  id: number
  name: string
  totalSales: number
  totalRevenue: number
  ticketCount: number
}

export type RevenueByMethod = {
  method: string
  count: number
  revenue: number
}

export type StatusDistribution = {
  status: string
  count: number
}

export type AnalyticsSnapshot = {
  salesOverTime: SalesOverTime
  topRaffles: TopRaffle[]
  revenueByMethod: RevenueByMethod[]
  statusDistribution: StatusDistribution[]
  dailyAverage: number
  totalRevenue: number
}

export async function getSalesOverTime(days = 30): Promise<SalesOverTime> {
  const pool = getPool()
  const [rows] = await pool.execute(
    `SELECT DATE(created_at) as date,
            COUNT(*) as count,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END), 0) as revenue
     FROM purchases
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY date`,
    [days],
  )
  return (rows as { date: string; count: number; revenue: number }[]).map((r) => ({
    ...r,
    count: Number(r.count),
    revenue: Number(r.revenue),
  }))
}

export async function getTopRaffles(limit = 5): Promise<TopRaffle[]> {
  const pool = getPool()
  const [rows] = await pool.execute(
    `SELECT r.id, r.name,
            COUNT(p.id) as total_sales,
            COALESCE(SUM(CASE WHEN p.status = 'approved' THEN p.total_amount ELSE 0 END), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN p.status = 'approved' THEN p.ticket_quantity ELSE 0 END), 0) as ticket_count
     FROM raffles r
     LEFT JOIN purchases p ON r.id = p.raffle_id
     GROUP BY r.id, r.name
     ORDER BY total_revenue DESC
     LIMIT ?`,
    [limit],
  )
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    name: r.name as string,
    totalSales: Number(r.total_sales),
    totalRevenue: Number(r.total_revenue),
    ticketCount: Number(r.ticket_count),
  }))
}

export async function getRevenueByMethod(days = 30): Promise<RevenueByMethod[]> {
  const pool = getPool()
  const [rows] = await pool.execute(
    `SELECT payment_method as method,
            COUNT(*) as count,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END), 0) as revenue
     FROM purchases
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY payment_method
     ORDER BY revenue DESC`,
    [days],
  )
  return (rows as Record<string, unknown>[]).map((r) => ({
    method: r.method as string,
    count: Number(r.count),
    revenue: Number(r.revenue),
  }))
}

export async function getStatusDistribution(days = 30): Promise<StatusDistribution[]> {
  const pool = getPool()
  const [rows] = await pool.execute(
    `SELECT status, COUNT(*) as count
     FROM purchases
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY status
     ORDER BY count DESC`,
    [days],
  )
  return (rows as Record<string, unknown>[]).map((r) => ({
    status: r.status as string,
    count: Number(r.count),
  }))
}

export async function getAnalyticsSnapshot(days = 30): Promise<AnalyticsSnapshot> {
  const pool = getPool()

  const [salesOverTime, topRaffles, revenueByMethod, statusDistribution] = await Promise.all([
    getSalesOverTime(days),
    getTopRaffles(5),
    getRevenueByMethod(days),
    getStatusDistribution(days),
  ])

  const [revenueRow] = await pool.execute(
    `SELECT COALESCE(SUM(total_amount), 0) as total
     FROM purchases WHERE status = 'approved'`,
  )
  const totalRevenue = Number(((revenueRow as { total: number }[])[0]!).total)

  const dailyAverage =
    salesOverTime.length > 0
      ? salesOverTime.reduce((sum, d) => sum + d.count, 0) / salesOverTime.length
      : 0

  return {
    salesOverTime,
    topRaffles,
    revenueByMethod,
    statusDistribution,
    dailyAverage,
    totalRevenue,
  }
}
