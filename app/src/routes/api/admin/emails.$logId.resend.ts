import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { resendEmailFromLog } from "@/server/email-admin.service"

export const Route = createFileRoute("/api/admin/emails/$logId/resend")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request, params }) => {
        await requireAdmin(request)
        const id = Number(params.logId)
        if (!Number.isFinite(id)) {
          return Response.json({ error: "ID inválido" }, { status: 400 })
        }
        const result = await resendEmailFromLog(id)
        if ("status" in result && result.status === 404) {
          return Response.json({ error: result.error }, { status: 404 })
        }
        if ("status" in result && result.status === 400) {
          return Response.json({ error: result.error }, { status: 400 })
        }
        if (!result.success) {
          return Response.json({ error: result.error ?? "Error al reenviar" }, { status: 500 })
        }
        return Response.json({
          message: "Correo reenviado",
          logId: result.logId,
        })
      },
    }),
  },
})
