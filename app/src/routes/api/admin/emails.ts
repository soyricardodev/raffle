import { parseAdminEmailListFromUrl } from "@raffle/shared/admin/email-list-filters"
import { createFileRoute } from "@tanstack/react-router"
import { apiHandlers } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/auth-utils.server"
import {
  exportEmailLogs,
  listEmailLogs,
  sendAdminTestEmail,
} from "@/server/email-admin.service"

export const Route = createFileRoute("/api/admin/emails")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await requireAdmin(request)
        const url = new URL(request.url)

        if (url.searchParams.get("export") === "csv") {
          const params = parseAdminEmailListFromUrl(url)
          const { csv, rowCount, truncated, total } = await exportEmailLogs(params)
          return new Response(csv, {
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="email-logs-${rowCount}.csv"`,
              ...(truncated
                ? { "X-Export-Truncated": "true", "X-Export-Total": String(total) }
                : {}),
            },
          })
        }

        return Response.json(await listEmailLogs(parseAdminEmailListFromUrl(url)))
      },
      POST: async ({ request }) => {
        await requireAdmin(request)
        const body = await request.json()
        const result = await sendAdminTestEmail(body)
        if (!result.success) {
          return Response.json({ error: result.error ?? "Error al enviar" }, { status: 500 })
        }
        return Response.json(result)
      },
    }),
  },
})
