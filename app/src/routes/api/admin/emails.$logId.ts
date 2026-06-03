import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { getEmailLogDetail } from "@/server/email-admin.service"

export const Route = createFileRoute("/api/admin/emails/$logId")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request, params }) => {
        await requireAdmin(request)
        const id = Number(params.logId)
        if (!Number.isFinite(id)) {
          return Response.json({ error: "ID inválido" }, { status: 400 })
        }
        const detail = await getEmailLogDetail(id)
        if (!detail) {
          return Response.json({ error: "No encontrado" }, { status: 404 })
        }
        return Response.json(detail)
      },
    }),
  },
})
