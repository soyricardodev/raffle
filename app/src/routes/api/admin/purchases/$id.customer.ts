import {
  assertCustomerLocationMunicipality,
  UpdatePurchaseCustomerInput,
} from "@raffle/shared/validators"
import { apiHandlers } from "@/lib/api-handler"
import { adminPurchaseRouteContext } from "@/lib/admin-purchase-route.server"
import { getEnv } from "@/lib/env"
import { getPurchaseById, updatePurchaseCustomerContact } from "@/server/purchase.service"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/admin/purchases/$id/customer")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        const { purchaseId, audit } = await adminPurchaseRouteContext(request, params.id)
        const body = UpdatePurchaseCustomerInput.parse(await request.json())
        assertCustomerLocationMunicipality(
          body.customerLocation,
          getEnv().ENABLE_VENEZUELA_MUNICIPALITY,
        )
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
