import type { AnalyticsDateRange } from "@raffle/shared/analytics"
import * as analyticsRepo from "./repositories/analytics.repository"

export type AnalyticsScope = analyticsRepo.AnalyticsScope
export type PurchaseSummary = analyticsRepo.PurchaseSummary
export type FullAnalyticsReport = Awaited<ReturnType<typeof getFullAnalyticsReport>>

function scope(range: AnalyticsDateRange, raffleId?: number): AnalyticsScope {
  return { range, raffleId }
}

export async function getFullAnalyticsReport(range: AnalyticsDateRange, raffleId?: number) {
  const analyticsScope = scope(range, raffleId)

  const summary = await analyticsRepo.getPurchaseSummary(analyticsScope)

  const [
    salesOverTime,
    topRaffles,
    revenueByMethod,
    statusDistribution,
    salesByWeekday,
    salesByHour,
    currencySplit,
    locationBreakdown,
    repeatCustomers,
    promotionImpact,
    purchaseSuccessFunnel,
    raffleVelocity,
    periodComparison,
    filterRaffles,
  ] = await Promise.all([
    analyticsRepo.getSalesOverTime(analyticsScope),
    analyticsRepo.getTopRaffles(analyticsScope, 10),
    analyticsRepo.getRevenueByMethod(analyticsScope),
    analyticsRepo.getStatusDistribution(analyticsScope),
    analyticsRepo.getSalesByWeekday(analyticsScope),
    analyticsRepo.getSalesByHour(analyticsScope),
    analyticsRepo.getCurrencySplit(analyticsScope),
    analyticsRepo.getLocationBreakdown(analyticsScope),
    analyticsRepo.getRepeatCustomerStats(analyticsScope),
    analyticsRepo.getPromotionImpact(analyticsScope),
    analyticsRepo.getPurchaseSuccessFunnel(analyticsScope),
    analyticsRepo.getRaffleVelocity(analyticsScope, 10),
    analyticsRepo.getPeriodComparison(analyticsScope, summary),
    analyticsRepo.listRafflesForAnalytics(),
  ])

  const dailyAverage =
    salesOverTime.length > 0
      ? salesOverTime.reduce((sum, d) => sum + d.count, 0) / salesOverTime.length
      : 0

  return {
    range,
    filterRaffles,
    salesOverTime,
    topRaffles,
    revenueByMethod,
    statusDistribution,
    summary,
    salesByWeekday,
    salesByHour,
    currencySplit,
    locationByState: locationBreakdown.byState,
    locationMix: locationBreakdown.mix,
    repeatCustomers,
    promotionImpact,
    purchaseSuccessFunnel,
    raffleVelocity,
    periodComparison,
    dailyAverage,
    totalRevenue: summary.totalRevenue,
  }
}

export async function getDashboardAnalyticsSummary(range: AnalyticsDateRange, raffleId?: number) {
  const analyticsScope = scope(range, raffleId)
  const [summary, salesOverTime, revenueByMethod, statusDistribution] = await Promise.all([
    analyticsRepo.getPurchaseSummary(analyticsScope),
    analyticsRepo.getSalesOverTime(analyticsScope),
    analyticsRepo.getRevenueByMethod(analyticsScope),
    analyticsRepo.getStatusDistribution(analyticsScope),
  ])

  const dailyAverage =
    salesOverTime.length > 0
      ? salesOverTime.reduce((sum, d) => sum + d.count, 0) / salesOverTime.length
      : 0

  return {
    salesOverTime,
    revenueByMethod,
    statusDistribution,
    summary,
    dailyAverage,
    totalRevenue: summary.totalRevenue,
  }
}
