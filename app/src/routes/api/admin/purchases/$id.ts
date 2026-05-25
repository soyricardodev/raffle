import { createFileRoute } from "@tanstack/react-router"
import { getPurchaseById } from "@/server/purchase.service"
import { requireAdmin } from "@/lib/auth-utils.server"

export const Route = createFileRoute("/api/admin/purchases/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        await requireAdmin(request)
        return Response.json(await getPurchaseById(Number(params.id)))
      },
    },
  },
})
