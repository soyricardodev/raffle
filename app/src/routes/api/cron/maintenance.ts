import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { getEnv } from "@/lib/env"
import { runMaintenanceJobs } from "@/server/scheduler.service"

export const Route = createFileRoute("/api/cron/maintenance")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        const secret = request.headers.get("x-cron-secret")
        const env = getEnv()
        const expected = env.CRON_SECRET ?? env.INNGEST_EVENT_KEY
        if (!expected || secret !== expected) {
          return new Response("Unauthorized", { status: 401 })
        }
        const result = await runMaintenanceJobs()
        return Response.json({ success: true, ...result })
      },
    }),
  },
})
