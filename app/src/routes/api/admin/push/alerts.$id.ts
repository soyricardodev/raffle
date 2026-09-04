import { ValidationError } from "@raffle/shared/errors"
import { AdminPushAutoAlertUpdateInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { rateLimit } from "@/lib/rate-limit"
import {
  deleteAdminPushAutoAlert,
  updateAdminPushAutoAlert,
} from "@/server/push-auto-alerts.service"

export const Route = createFileRoute("/api/admin/push/alerts/$id")({
  server: {
    handlers: apiHandlers({
      PATCH: async ({ request, params }) => {
        await requireAdmin(request)
        await rateLimit(request, {
          windowMs: 60_000,
          maxRequests: 60,
          keyPrefix: "admin-push-alerts-update",
        })
        const id = Number(params.id)
        const parsed = AdminPushAutoAlertUpdateInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError("Aviso inválido", parsed.error.flatten().fieldErrors)
        }
        return Response.json(await updateAdminPushAutoAlert(id, parsed.data))
      },
      DELETE: async ({ request, params }) => {
        await requireAdmin(request)
        await rateLimit(request, {
          windowMs: 60_000,
          maxRequests: 30,
          keyPrefix: "admin-push-alerts-delete",
        })
        const id = Number(params.id)
        await deleteAdminPushAutoAlert(id)
        return Response.json({ ok: true })
      },
    }),
  },
})
