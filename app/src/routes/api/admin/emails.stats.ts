import { parseAdminEmailListFromUrl } from "@raffle/shared/admin/email-list-filters"
import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import { getEmailLogStats } from "@/server/email-admin.service"

export const Route = createFileRoute("/api/admin/emails/stats")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await requireAdmin(request)
        const filters = parseAdminEmailListFromUrl(new URL(request.url))
        return Response.json(
          await getEmailLogStats({
            search: filters.search,
            start: filters.start,
            end: filters.end,
            emailType: filters.emailType,
            purchaseId: filters.purchaseId,
          }),
        )
      },
    }),
  },
})
