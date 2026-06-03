import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import { getDashboardStats } from "@/server/raffle.service"

export const Route = createFileRoute("/api/admin/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAdmin(request)
        const url = new URL(request.url)
        const raffleIdParam = url.searchParams.get("raffleId")
        const raffleId = raffleIdParam ? Number(raffleIdParam) : undefined
        return Response.json(
          await getDashboardStats(raffleId && !Number.isNaN(raffleId) ? raffleId : undefined),
        )
      },
    },
  },
})
