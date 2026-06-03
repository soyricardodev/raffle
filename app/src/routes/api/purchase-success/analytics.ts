import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { getLogger } from "@/lib/logger"
import { rateLimit } from "@/lib/rate-limit"
import {
  isPurchaseSuccessAnalyticsValidationError,
  recordPurchaseSuccessAnalyticsEvent,
} from "@/server/purchase-success-analytics.service"

const logger = getLogger()

export const Route = createFileRoute("/api/purchase-success/analytics")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        await rateLimit(request, {
          windowMs: 60_000,
          maxRequests: 120,
          keyPrefix: "purchase-success-analytics",
        })

        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 })
        }

        try {
          const result = await recordPurchaseSuccessAnalyticsEvent(body)
          return Response.json(result)
        } catch (error) {
          if (isPurchaseSuccessAnalyticsValidationError(error)) {
            return Response.json({ error: "Evento inválido" }, { status: 400 })
          }
          logger.error({ err: error }, "purchase_success_analytics_insert_failed")
          return Response.json({ error: "No se pudo registrar el evento" }, { status: 500 })
        }
      },
    }),
  },
})
