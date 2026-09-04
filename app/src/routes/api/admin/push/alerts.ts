import { ValidationError } from "@raffle/shared/errors"
import {
  AdminPushAutoAlertCreateInput,
  AdminPushAutoAlertsReorderInput,
} from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { rateLimit } from "@/lib/rate-limit"
import {
  createAdminPushAutoAlert,
  reorderAdminPushAutoAlerts,
} from "@/server/push-auto-alerts.service"

export const Route = createFileRoute("/api/admin/push/alerts")({
  server: {
    handlers: apiHandlers({
      PUT: async ({ request }) => {
        await requireAdmin(request)
        await rateLimit(request, {
          windowMs: 60_000,
          maxRequests: 30,
          keyPrefix: "admin-push-alerts-reorder",
        })
        const parsed = AdminPushAutoAlertsReorderInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError("Orden inválido", parsed.error.flatten().fieldErrors)
        }
        return Response.json(await reorderAdminPushAutoAlerts(parsed.data))
      },
      POST: async ({ request }) => {
        await requireAdmin(request)
        await rateLimit(request, {
          windowMs: 60_000,
          maxRequests: 30,
          keyPrefix: "admin-push-alerts-create",
        })
        const parsed = AdminPushAutoAlertCreateInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError("Aviso inválido", parsed.error.flatten().fieldErrors)
        }
        const created = await createAdminPushAutoAlert(parsed.data)
        return Response.json(created, { status: 201 })
      },
    }),
  },
})
