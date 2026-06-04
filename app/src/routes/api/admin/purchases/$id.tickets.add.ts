import { AddRemoveTicketsInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { parsePositiveRouteId } from "@/lib/parse-positive-route-id"
import { addTicketsToPurchase } from "@/server/purchase.service"

export const Route = createFileRoute("/api/admin/purchases/$id/tickets/add")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const purchaseId = parsePositiveRouteId(params.id, "ID de compra")
        const body = AddRemoveTicketsInput.parse(await request.json())
        const result = await addTicketsToPurchase(purchaseId, body.quantity)
        return Response.json(result)
      },
    }),
  },
})
