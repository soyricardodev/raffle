import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { rateLimit } from "@/lib/rate-limit"
import { getVapidPublicKey, isWebPushConfigured } from "@/server/push.service"

export const Route = createFileRoute("/api/push/config")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await rateLimit(request, { windowMs: 60_000, maxRequests: 60, keyPrefix: "push-config" })
        const vapidPublicKey = getVapidPublicKey()
        return Response.json({
          enabled: isWebPushConfigured() && Boolean(vapidPublicKey),
          vapidPublicKey,
        })
      },
    }),
  },
})
