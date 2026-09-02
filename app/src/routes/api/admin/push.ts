import { ValidationError } from "@raffle/shared/errors"
import { AdminPushBroadcastInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { rateLimit } from "@/lib/rate-limit"
import { listAdminPushSubscribers, sendManualBroadcast } from "@/server/push.service"

export const Route = createFileRoute("/api/admin/push")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await requireAdmin(request)
        return Response.json(await listAdminPushSubscribers())
      },
      POST: async ({ request }) => {
        await requireAdmin(request)
        await rateLimit(request, {
          windowMs: 60_000,
          maxRequests: 10,
          keyPrefix: "admin-push-broadcast",
        })
        const parsed = AdminPushBroadcastInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError("Aviso inválido", parsed.error.flatten().fieldErrors)
        }
        return Response.json(await sendManualBroadcast(parsed.data))
      },
    }),
  },
})
