import { UpdatePurchaseStatusInput } from "@raffle/shared/validators"
import { apiHandlers } from "@/lib/api-handler"
import { createFileRoute } from "@tanstack/react-router"
import { adminPurchaseRouteContext } from "@/lib/admin-purchase-route.server"
import { updatePurchaseStatus } from "@/server/purchase.service"

export const Route = createFileRoute("/api/admin/purchases/$id/status")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        const { purchaseId, audit } = await adminPurchaseRouteContext(request, params.id)
        const body = UpdatePurchaseStatusInput.parse(await request.json())
        const result = await updatePurchaseStatus(purchaseId, body.status, body.notes, audit)
        return Response.json(result)
      },
    }),
  },
})
