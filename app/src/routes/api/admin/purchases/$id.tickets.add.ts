import { createFileRoute } from "@tanstack/react-router"
import { addTicketsToPurchase } from "@/server/purchase.service"
import { requireAdmin } from "@/lib/auth-utils.server"

export const Route = createFileRoute("/api/admin/purchases/$id/tickets/add")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = await request.json() as { quantity: number }
        const result = await addTicketsToPurchase(Number(params.id), body.quantity)
        return Response.json(result)
      },
    },
  },
})
