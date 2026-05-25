import { createFileRoute } from "@tanstack/react-router"
import { listAdminPurchases } from "@/server/purchase.service"
import { requireAdmin } from "@/lib/auth-utils.server"

export const Route = createFileRoute("/api/admin/purchases/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAdmin(request)
        const url = new URL(request.url)

        const result = await listAdminPurchases({
          limit: Number(url.searchParams.get("limit") || 50),
          page: Number(url.searchParams.get("page") || 1),
          status: url.searchParams.get("status") ?? "all",
          raffleId: url.searchParams.get("raffle_id"),
          search: url.searchParams.get("search"),
          searchType: url.searchParams.get("search_type") ?? "all",
          start: url.searchParams.get("start"),
          end: url.searchParams.get("end"),
        })

        return Response.json(result)
      },
    },
  },
})
