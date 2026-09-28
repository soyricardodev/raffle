import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { requirePurchasesModuleAccess } from "@/lib/purchases-access.server"
import { purchaseTicketPermissionsForUser } from "@/lib/workforce-access.server"
import { getPurchaseById } from "@/server/purchase.service"

export const Route = createFileRoute("/api/admin/purchases/$id")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request, params }) => {
        const user = await requireAdmin(request)
        await requirePurchasesModuleAccess(request)
        const purchase = await getPurchaseById(Number(params.id))
        if (!purchase) return Response.json(null)
        return Response.json({
          ...purchase,
          allowed_ticket_actions: await purchaseTicketPermissionsForUser(user, purchase.raffle_id),
        })
      },
    }),
  },
})
