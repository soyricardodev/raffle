import { createFileRoute } from "@tanstack/react-router"
import { getPauseInfo } from "@/server/pause.service"
import { rateLimit } from "@/lib/rate-limit"

export const Route = createFileRoute("/api/raffles/$id/pause-info")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        await rateLimit(request, { windowMs: 60_000, maxRequests: 30, keyPrefix: "pause-info" })
        return Response.json(await getPauseInfo(Number(params.id)))
      },
    },
  },
})
