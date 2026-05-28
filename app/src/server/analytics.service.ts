import * as analyticsRepo from "./repositories/analytics.repository"

export type SalesOverTime = Awaited<ReturnType<typeof analyticsRepo.getSalesOverTime>>
export type TopRaffle = Awaited<ReturnType<typeof analyticsRepo.getTopRaffles>>[number]
export type RevenueByMethod = Awaited<ReturnType<typeof analyticsRepo.getRevenueByMethod>>[number]
export type StatusDistribution = Awaited<ReturnType<typeof analyticsRepo.getStatusDistribution>>[number]

export type AnalyticsSnapshot = {
  salesOverTime: SalesOverTime
  topRaffles: TopRaffle[]
  revenueByMethod: RevenueByMethod[]
  statusDistribution: StatusDistribution[]
  dailyAverage: number
  totalRevenue: number
}

export const getSalesOverTime = analyticsRepo.getSalesOverTime
export const getTopRaffles = analyticsRepo.getTopRaffles
export const getRevenueByMethod = analyticsRepo.getRevenueByMethod
export const getStatusDistribution = analyticsRepo.getStatusDistribution

export async function getAnalyticsSnapshot(
  days = 30,
  raffleId?: number,
): Promise<AnalyticsSnapshot> {
  const [salesOverTime, topRaffles, revenueByMethod, statusDistribution, totalRevenue] =
    await Promise.all([
      analyticsRepo.getSalesOverTime(days, raffleId),
      analyticsRepo.getTopRaffles(5, raffleId),
      analyticsRepo.getRevenueByMethod(days, raffleId),
      analyticsRepo.getStatusDistribution(days, raffleId),
      analyticsRepo.getTotalApprovedRevenue(raffleId),
    ])

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
