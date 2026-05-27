import { createFileRoute } from "@tanstack/react-router"
import { getAnalyticsSnapshot, getSalesOverTime, getTopRaffles, getRevenueByMethod, getStatusDistribution } from "@/server/analytics.service"
import { requireAdmin } from "@/lib/auth-utils.server"

export const Route = createFileRoute("/api/admin/analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAdmin(request)
        const url = new URL(request.url)
        const days = Number(url.searchParams.get("days") || 30)

        const [snapshot, salesOverTime, topRaffles, revenueByMethod, statusDistribution] =
          await Promise.all([
            getAnalyticsSnapshot(days),
            getSalesOverTime(days),
            getTopRaffles(5),
            getRevenueByMethod(days),
            getStatusDistribution(days),
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
