import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { isAuthorizedCronRequest } from "@/lib/cron-auth.server"
import { runMaintenanceJobs } from "@/server/scheduler.service"

export const Route = createFileRoute("/api/cron/maintenance")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        if (!isAuthorizedCronRequest(request)) {
          return new Response("Unauthorized", { status: 401 })
        }
        const result = await runMaintenanceJobs()
        return Response.json({ success: true, ...result })
      },
    }),
  },
})
