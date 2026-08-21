import {
  assertCustomerLocationMunicipality,
  UpdatePurchaseCustomerInput,
} from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { adminPurchaseRouteContext } from "@/lib/admin-purchase-route.server"
import { apiHandlers } from "@/lib/api-handler"
import { getPurchaseById, updatePurchaseCustomerContact } from "@/server/purchase.service"

export const Route = createFileRoute("/api/admin/purchases/$id/customer")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        const { purchaseId, audit } = await adminPurchaseRouteContext(request, params.id, {
          requireModuleAccess: true,
        })
        const body = UpdatePurchaseCustomerInput.parse(await request.json())
        // New Venezuela locations must include municipality; legacy state-only
        // strings from older raffles stay valid so admin can still edit them.
        assertCustomerLocationMunicipality(body.customerLocation, false)
        const result = await updatePurchaseCustomerContact(purchaseId, body, audit)
        if ("noChange" in result && result.noChange) {
          return Response.json(result)
        }
        const purchase = await getPurchaseById(purchaseId)
        if (!purchase) {
          return Response.json({ error: "Compra no encontrada" }, { status: 404 })
        }
        return Response.json(purchase)
      },
    }),
  },
})
