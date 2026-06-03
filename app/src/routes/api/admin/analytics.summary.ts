import { parseAnalyticsDateRange } from "@raffle/shared/analytics"
import { apiHandlers } from "@/lib/api-handler"
import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import { getDashboardAnalyticsSummary } from "@/server/analytics.service"

export const Route = createFileRoute("/api/admin/analytics/summary")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await requireAdmin(request)
        const url = new URL(request.url)
        const range = parseAnalyticsDateRange(url.searchParams)
        const raffleIdParam = url.searchParams.get("raffleId")
        const raffleId =
          raffleIdParam && !Number.isNaN(Number(raffleIdParam)) ? Number(raffleIdParam) : undefined

        return Response.json(await getDashboardAnalyticsSummary(range, raffleId))
      },
    }),
  },
})
