import { createFileRoute } from "@tanstack/react-router"
import { getDashboardStats } from "@/server/raffle.service"
import { requireAdmin } from "@/lib/auth-utils.server"

export const Route = createFileRoute("/api/admin/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAdmin(request)
        return Response.json(await getDashboardStats())
      },
    },
  },
})
