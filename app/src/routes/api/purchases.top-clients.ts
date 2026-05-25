import { createFileRoute } from "@tanstack/react-router"
import { getClientPurchases } from "@/server/purchase.service"

export const Route = createFileRoute("/api/purchases/top-clients")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const status = url.searchParams.get("status") ?? undefined
        const raffleId = url.searchParams.get("raffle_id") ? Number(url.searchParams.get("raffle_id")) : undefined
        const limit = Number(url.searchParams.get("limit") || 10)
        return Response.json(await getClientPurchases({ status, raffleId, limit }))
      },
    },
  },
})
