import { UpdatePurchaseStatusInput } from "@raffle/shared/validators"
import { apiHandlers } from "@/lib/api-handler"
import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import { updatePurchaseStatus } from "@/server/purchase.service"

export const Route = createFileRoute("/api/admin/purchases/$id/status")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = UpdatePurchaseStatusInput.parse(await request.json())
        const result = await updatePurchaseStatus(Number(params.id), body.status, body.notes)
        return Response.json(result)
      },
    }),
  },
})
