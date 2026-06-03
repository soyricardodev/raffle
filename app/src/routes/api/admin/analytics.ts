import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import {
  getAnalyticsSnapshot,
  getRevenueByMethod,
  getSalesOverTime,
  getStatusDistribution,
  getTopRaffles,
} from "@/server/analytics.service"

export const Route = createFileRoute("/api/admin/analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAdmin(request)
        const url = new URL(request.url)
        const days = Number(url.searchParams.get("days") || 30)
        const raffleIdParam = url.searchParams.get("raffleId")
        const raffleId =
          raffleIdParam && !Number.isNaN(Number(raffleIdParam)) ? Number(raffleIdParam) : undefined

        const [snapshot, salesOverTime, topRaffles, revenueByMethod, statusDistribution] =
          await Promise.all([
            getAnalyticsSnapshot(days, raffleId),
            getSalesOverTime(days, raffleId),
            getTopRaffles(5, raffleId),
            getRevenueByMethod(days, raffleId),
            getStatusDistribution(days, raffleId),
          ])

        return Response.json({
          ...snapshot,
          salesOverTime,
          topRaffles,
          revenueByMethod,
          statusDistribution,
        })
      },
    },
  },
})
