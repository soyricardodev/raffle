import { SendPurchaseEmailInput } from "@raffle/shared/admin/email-list-filters"
import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { sendPurchaseEmailByType } from "@/server/purchase-notifications"

export const Route = createFileRoute("/api/admin/purchases/$id/emails/send")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request, params }) => {
        await requireAdmin(request)
        const purchaseId = Number(params.id)
        const body = SendPurchaseEmailInput.parse(await request.json())
        const result = await sendPurchaseEmailByType(purchaseId, body.type, {
          status: body.status,
        })
        if (!result.success) {
          return Response.json({ error: result.error ?? "Error al enviar" }, { status: 400 })
        }
        return Response.json({ message: "Correo enviado", success: true })
      },
    }),
  },
})
