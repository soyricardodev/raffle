import { createFileRoute } from "@tanstack/react-router"
import { createPurchase } from "@/server/purchase.service"
import type { CreatePurchaseParams } from "@/server/purchase.service"
import { ValidationError } from "@raffle/shared/errors"
import { rateLimit } from "@/lib/rate-limit"

export const Route = createFileRoute("/api/purchases/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await rateLimit(request, { windowMs: 10_000, maxRequests: 5, keyPrefix: "purchase" })

        const body = await request.json() as CreatePurchaseParams

        // Basic validation
        if (!body.raffleId || !body.customerName || !body.customerPhone || !body.paymentMethod) {
          throw new ValidationError("Campos requeridos faltantes")
        }

        const result = await createPurchase(body)
        return Response.json(result, { status: 201 })
      },
    },
  },
})
