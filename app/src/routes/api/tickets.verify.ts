import { createFileRoute } from "@tanstack/react-router"
import { getPool } from "@/lib/db.server"
import { rateLimit } from "@/lib/rate-limit"

export const Route = createFileRoute("/api/tickets/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await rateLimit(request, { windowMs: 30_000, maxRequests: 10, keyPrefix: "verify" })

        const body = await request.json() as { phone?: string; ticketNumber?: string; cedula?: string; email?: string }
        const pool = getPool()

        const conditions: string[] = []
        const values: (string | number)[] = []

        if (body.phone?.trim()) { conditions.push("p.customer_phone = ?"); values.push(body.phone.trim()) }
        if (body.ticketNumber?.trim()) { conditions.push("t.ticket_number = ?"); values.push(body.ticketNumber.trim()) }
        if (body.cedula?.trim()) {
          const normalized = body.cedula.trim().replace(/[\s\-\.VEve]/g, "")
          conditions.push("(REPLACE(REPLACE(REPLACE(UPPER(p.customer_ci), 'V', ''), 'E', ''), '-', '') = ? OR p.customer_ci = ?)")
          values.push(normalized, body.cedula.trim())
        }
        if (body.email?.trim()) { conditions.push("LOWER(p.customer_email) = LOWER(?)"); values.push(body.email.trim()) }

        if (conditions.length === 0) {
          return Response.json({ error: "Debe proporcionar al menos un criterio de búsqueda" }, { status: 400 })
        }

        const [rows] = await pool.execute(
          `SELECT t.*, r.name as raffle_name, r.draw_date, p.customer_name, p.customer_phone,
                  p.customer_email, p.customer_ci as customer_cedula, p.status as purchase_status
           FROM tickets t
           JOIN raffles r ON t.raffle_id = r.id
           LEFT JOIN purchases p ON t.purchase_id = p.id
           WHERE (${conditions.join(" OR ")})
           AND t.status IN ('sold', 'reserved')
           AND r.status IN ('active', 'paused')
           ORDER BY CAST(t.ticket_number AS UNSIGNED), r.name`,
          values,
        )

        return Response.json(rows)
      },
    },
  },
})
