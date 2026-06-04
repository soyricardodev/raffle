import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import {
  parseCreatePurchaseRequest,
  purchaseFailureMetricFields,
  submitPublicPurchase,
} from "@/lib/purchase-api.server"
import { recordPurchaseMetric, recordPurchaseTiming } from "@/lib/purchase-metrics.server"

export const Route = createFileRoute("/api/purchases/")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        const started = performance.now()
        recordPurchaseMetric("purchase_attempt", {})

        try {
          const params = await parseCreatePurchaseRequest(request)
          const result = await submitPublicPurchase(request, params)
          return Response.json(result, { status: 201 })
        } catch (error) {
          recordPurchaseMetric("purchase_failure", {
            durationMs: Math.round(performance.now() - started),
            ...purchaseFailureMetricFields(error),
          })
          throw error
        } finally {
          recordPurchaseTiming("api_purchases_post", Math.round(performance.now() - started))
        }
      },
    }),
  },
})
