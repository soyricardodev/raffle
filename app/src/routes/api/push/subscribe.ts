import { ValidationError } from "@raffle/shared/errors"
import { PushSubscribeInput, PushUnsubscribeInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { rateLimit } from "@/lib/rate-limit"
import {
  isWebPushConfigured,
  removePushSubscription,
  savePushSubscription,
} from "@/server/push.service"

export const Route = createFileRoute("/api/push/subscribe")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        await rateLimit(request, { windowMs: 60_000, maxRequests: 20, keyPrefix: "push-subscribe" })
        if (!isWebPushConfigured()) {
          throw new ValidationError("Las notificaciones no están configuradas en el servidor")
        }
        const parsed = PushSubscribeInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError(
            "Suscripción de avisos inválida",
            parsed.error.flatten().fieldErrors,
          )
        }
        await savePushSubscription({
          endpoint: parsed.data.endpoint,
          p256dh: parsed.data.keys.p256dh,
          auth: parsed.data.keys.auth,
          userAgent: request.headers.get("user-agent"),
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
        })
        return Response.json({ ok: true })
      },
      DELETE: async ({ request }) => {
        await rateLimit(request, {
          windowMs: 60_000,
          maxRequests: 20,
          keyPrefix: "push-unsubscribe",
        })
        const parsed = PushUnsubscribeInput.safeParse(await request.json())
        if (!parsed.success) {
          throw new ValidationError(
            "Suscripción de avisos inválida",
            parsed.error.flatten().fieldErrors,
          )
        }
        await removePushSubscription(parsed.data.endpoint)
        return Response.json({ ok: true })
      },
    }),
  },
})
