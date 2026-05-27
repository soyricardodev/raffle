import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import { runMaintenanceJobs } from "@/server/scheduler.service"

export const Route = createFileRoute("/api/admin/maintenance")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAdmin(request)
        return Response.json({ status: "ok", message: "Use POST to run maintenance jobs" })
      },
      POST: async ({ request }) => {
        await requireAdmin(request)
        const result = await runMaintenanceJobs()
        return Response.json({ success: true, ...result })
      },
    },
  },
})
