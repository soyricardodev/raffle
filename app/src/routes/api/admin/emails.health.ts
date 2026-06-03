import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { getEmailProviderHealth } from "@/server/email-admin.service"

export const Route = createFileRoute("/api/admin/emails/health")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await requireAdmin(request)
        return Response.json(getEmailProviderHealth())
      },
    }),
  },
})
