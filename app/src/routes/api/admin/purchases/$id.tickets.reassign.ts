import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { reassignTicketsToPurchase } from "@/server/purchase.service"

export const Route = createFileRoute("/api/admin/purchases/$id/tickets/reassign")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const result = await reassignTicketsToPurchase(Number(params.id))
        return Response.json(result)
      },
    }),
  },
})
