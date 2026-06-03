import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { removeTicketsFromPurchase } from "@/server/purchase.service"

export const Route = createFileRoute("/api/admin/purchases/$id/tickets/remove")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = (await request.json()) as { quantity: number }
        const result = await removeTicketsFromPurchase(Number(params.id), body.quantity)
        return Response.json(result)
      },
    }),
  },
})
