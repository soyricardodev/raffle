import { createFileRoute } from "@tanstack/react-router"
import { requireAdmin } from "@/lib/auth-utils.server"
import { listEmailLogs } from "@/server/email-logs.service"
import { sendEmail } from "@/server/email/email.service"

export const Route = createFileRoute("/api/admin/emails")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAdmin(request)
        const url = new URL(request.url)
        return Response.json(
          await listEmailLogs({
            limit: Number(url.searchParams.get("limit") || 50),
            page: Number(url.searchParams.get("page") || 1),
            status: url.searchParams.get("status") ?? "all",
            search: url.searchParams.get("search"),
            start: url.searchParams.get("start"),
            end: url.searchParams.get("end"),
          })
        )
      },
      POST: async ({ request }) => {
        await requireAdmin(request)
        const body = (await request.json()) as { to: string; subject?: string }
        if (!body.to?.trim()) {
          return Response.json({ error: "Email requerido" }, { status: 400 })
        }
        const result = await sendEmail({
          to: body.to.trim(),
          type: "purchase_confirmation",
          subject: body.subject ?? "Email de prueba — Raffle",
          html: "<p>Este es un correo de prueba del sistema de rifas.</p>",
        })
        return Response.json(result)
      },
    },
  },
})
