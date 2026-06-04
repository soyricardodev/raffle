import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { adminPurchaseRouteContext } from "@/lib/admin-purchase-route.server"
import { reassignTicketsToPurchase } from "@/server/purchase.service"

export const Route = createFileRoute("/api/admin/purchases/$id/tickets/reassign")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        const { purchaseId, audit } = await adminPurchaseRouteContext(request, params.id)
        const result = await reassignTicketsToPurchase(purchaseId, audit)
        return Response.json(result)
      },
    }),
  },
})
