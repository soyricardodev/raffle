import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { getPaymentAccountUsage } from "@/server/payment-accounts.service"

export const Route = createFileRoute("/api/admin/payment-accounts/$id/usage")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request, params }) => {
        await requireAdmin(request)
        const id = Number(params.id)
        return Response.json(await getPaymentAccountUsage(id))
      },
    }),
  },
})
