import { purchases } from "@raffle/shared/db"
import { UpdatePurchaseStatusInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { eq } from "drizzle-orm"
import { adminPurchaseRouteContext } from "@/lib/admin-purchase-route.server"
import { apiHandlers } from "@/lib/api-handler"
import { requirePermission } from "@/lib/auth-utils.server"
import { getDb } from "@/lib/db.server"
import { updatePurchaseStatus } from "@/server/purchase.service"

export const Route = createFileRoute("/api/admin/purchases/$id/status")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        const { purchaseId, audit } = await adminPurchaseRouteContext(request, params.id)
        const body = UpdatePurchaseStatusInput.parse(await request.json())
        const [purchase] = await getDb()
          .select({ raffleId: purchases.raffleId })
          .from(purchases)
          .where(eq(purchases.id, purchaseId))
          .limit(1)
        const permission =
          body.status === "approved"
            ? "purchases.approve"
            : body.status === "rejected"
              ? "purchases.reject"
              : "purchases.reverse"
        await requirePermission(request, permission, purchase?.raffleId)
        const result = await updatePurchaseStatus(purchaseId, body.status, body.notes, audit)
        return Response.json(result)
      },
    }),
  },
})
