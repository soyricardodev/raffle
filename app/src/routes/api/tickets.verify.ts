import { apiHandlers } from "@/lib/api-handler"
import {
  normalizePhone,
  purchases,
  purchaseTickets,
  raffles,
  ticketNumberToInt,
} from "@raffle/shared/db"
import { VerifiedTicketRow, VerifyTicketInput } from "@raffle/shared/validators"
import { createFileRoute } from "@tanstack/react-router"
import { and, eq, inArray, or, sql } from "drizzle-orm"
import { getDb } from "@/lib/db.server"
import { rateLimit } from "@/lib/rate-limit"

export const Route = createFileRoute("/api/tickets/verify")({
  server: {
    handlers: apiHandlers({
      POST: async ({ request }) => {
        await rateLimit(request, { windowMs: 30_000, maxRequests: 10, keyPrefix: "verify" })

        let body: VerifyTicketInput
        try {
          body = VerifyTicketInput.parse(await request.json())
        } catch {
          return Response.json(
            { error: "Debe proporcionar al menos un criterio de búsqueda" },
            { status: 400 },
          )
        }

        const conditions = []
        if (body.phone?.trim()) {
          conditions.push(eq(purchases.customerPhoneNormalized, normalizePhone(body.phone.trim())))
        }
        if (body.ticketNumber?.trim()) {
          conditions.push(
            eq(purchaseTickets.ticketNumber, ticketNumberToInt(body.ticketNumber.trim())),
          )
        }
        if (body.cedula?.trim()) {
          const normalized = body.cedula
            .trim()
            .replace(/[\s\-.VEve]/g, "")
            .toUpperCase()
          conditions.push(
            or(
              sql`replace(replace(replace(upper(${purchases.customerCi}), 'V', ''), 'E', ''), '-', '') = ${normalized}`,
              eq(purchases.customerCi, body.cedula.trim()),
            )!,
          )
        }
        if (body.email?.trim()) {
          conditions.push(sql`lower(${purchases.customerEmail}) = lower(${body.email.trim()})`)
        }

        const db = getDb()
        const rows = await db
          .select({
            ticket_number: purchaseTickets.ticketNumber,
            status: purchaseTickets.status,
            raffle_id: purchaseTickets.raffleId,
            purchase_id: purchaseTickets.purchaseId,
            raffle_name: raffles.name,
            draw_date: raffles.drawDate,
            customer_name: purchases.customerName,
            customer_phone: purchases.customerPhone,
            customer_email: purchases.customerEmail,
            customer_cedula: purchases.customerCi,
            purchase_status: purchases.status,
            raffle_status: raffles.status,
          })
          .from(purchaseTickets)
          .innerJoin(raffles, eq(purchaseTickets.raffleId, raffles.id))
          .leftJoin(purchases, eq(purchaseTickets.purchaseId, purchases.id))
          .where(
            and(
              or(...conditions)!,
              inArray(purchaseTickets.status, ["sold", "reserved"]),
              inArray(raffles.status, ["active", "paused"]),
            ),
          )
          .orderBy(purchaseTickets.ticketNumber, raffles.name)

        const mapped = rows.map((r) => ({
          ticket_number: String(r.ticket_number).padStart(4, "0"),
          status: r.status,
          raffle_id: r.raffle_id,
          purchase_id: r.purchase_id,
          raffle_name: r.raffle_name,
          draw_date: r.draw_date == null ? null : String(r.draw_date),
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          customer_email: r.customer_email,
          customer_cedula: r.customer_cedula,
          purchase_status: r.purchase_status,
        }))

        const parsed = VerifiedTicketRow.array().safeParse(mapped)
        if (!parsed.success) {
          return Response.json({ error: "Error al formatear resultados" }, { status: 500 })
        }

        return Response.json(parsed.data)
      },
    }),
  },
})
