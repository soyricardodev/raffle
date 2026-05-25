import { createFileRoute } from "@tanstack/react-router"
import { updatePurchaseStatus } from "@/server/purchase.service"
import { requireAdmin } from "@/lib/auth-utils.server"
import { UpdatePurchaseStatusInput } from "@raffle/shared/validators"

export const Route = createFileRoute("/api/admin/purchases/$id/status")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = UpdatePurchaseStatusInput.parse(await request.json())
        const result = await updatePurchaseStatus(Number(params.id), body.status, body.notes)
        return Response.json(result)
      },
    },
  },
})
