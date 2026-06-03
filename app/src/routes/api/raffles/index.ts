import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { getAllRaffles } from "@/server/raffle.service"

export const Route = createFileRoute("/api/raffles/")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const status = url.searchParams.get("status") ?? undefined
        const limit = Number(url.searchParams.get("limit") || 10)
        const page = Number(url.searchParams.get("page") || 1)
        return Response.json(await getAllRaffles({ status, limit, page }))
      },
    }),
  },
})
