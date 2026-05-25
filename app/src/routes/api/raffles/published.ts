import { createFileRoute } from "@tanstack/react-router"
import { getPublishedRaffles } from "@/server/raffle.service"

export const Route = createFileRoute("/api/raffles/published")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const limit = Number(url.searchParams.get("limit") || 10)
        const page = Number(url.searchParams.get("page") || 1)
        const result = await getPublishedRaffles(limit, page)
        return Response.json(result)
      },
    },
  },
})
