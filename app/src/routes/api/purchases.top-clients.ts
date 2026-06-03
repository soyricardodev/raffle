import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { rateLimit } from "@/lib/rate-limit"
import { getClientPurchases } from "@/server/purchase.service"

export const Route = createFileRoute("/api/purchases/top-clients")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await rateLimit(request, { windowMs: 60_000, maxRequests: 10, keyPrefix: "top-clients" })
        const url = new URL(request.url)
        const status = url.searchParams.get("status") ?? undefined
        const raffleId = url.searchParams.get("raffle_id")
          ? Number(url.searchParams.get("raffle_id"))
          : undefined
        const limit = Number(url.searchParams.get("limit") || 10)
        return Response.json(await getClientPurchases({ status, raffleId, limit }))
      },
    }),
  },
})
