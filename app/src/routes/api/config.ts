import { createFileRoute } from "@tanstack/react-router"
import { rateLimit } from "@/lib/rate-limit"
import { getSiteConfigMap } from "@/server/site-config.service"

export const Route = createFileRoute("/api/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await rateLimit(request, { windowMs: 60_000, maxRequests: 60, keyPrefix: "config" })
        const result = await getSiteConfigMap()
        return Response.json(result)
      },
    },
  },
})
