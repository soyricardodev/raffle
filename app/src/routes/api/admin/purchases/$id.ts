import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { getPurchaseById } from "@/server/purchase.service"

export const Route = createFileRoute("/api/admin/purchases/$id")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request, params }) => {
        await requireAdmin(request)
        return Response.json(await getPurchaseById(Number(params.id)))
      },
    }),
  },
})
