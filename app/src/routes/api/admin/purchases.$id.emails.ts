import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { listEmailLogsForPurchase } from "@/server/email-admin.service"

export const Route = createFileRoute("/api/admin/purchases/$id/emails")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request, params }) => {
        await requireAdmin(request)
        const purchaseId = Number(params.id)
        const url = new URL(request.url)
        const limit = Math.min(Number(url.searchParams.get("limit") || 10), 50)
        return Response.json(await listEmailLogsForPurchase(purchaseId, limit))
      },
    }),
  },
})
