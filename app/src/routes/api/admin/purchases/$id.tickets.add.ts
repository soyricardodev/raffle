import { AddRemoveTicketsInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { adminPurchaseRouteContext } from "@/lib/admin-purchase-route.server"
import { addTicketsToPurchase } from "@/server/purchase.service"

export const Route = createFileRoute("/api/admin/purchases/$id/tickets/add")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        const { purchaseId, audit } = await adminPurchaseRouteContext(request, params.id)
        const body = AddRemoveTicketsInput.parse(await request.json())
        const result = await addTicketsToPurchase(purchaseId, body.quantity, audit)
        return Response.json(result)
      },
    }),
  },
})
