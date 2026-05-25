import { createFileRoute } from "@tanstack/react-router"
import {
  updatePurchaseStatus,
  addTicketsToPurchase,
  removeTicketsFromPurchase,
  reassignTicketsToPurchase,
  getPurchaseById,
} from "@/server/purchase.service"
import { requireAdmin } from "@/lib/auth-utils.server"
import { getPool } from "@/lib/db.server"

export const Route = createFileRoute("/api/admin/purchases")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAdmin(request)
        const url = new URL(request.url)
        const pool = getPool()

        const limit = Number(url.searchParams.get("limit") || 50)
        const page = Number(url.searchParams.get("page") || 1)
        const status = url.searchParams.get("status") ?? "all"
        const raffleId = url.searchParams.get("raffle_id")
        const search = url.searchParams.get("search")
        const searchType = url.searchParams.get("search_type") ?? "all"
        const start = url.searchParams.get("start")
        const end = url.searchParams.get("end")

        let query = `
          SELECT p.*, r.name as raffle_name,
                 GROUP_CONCAT(t.ticket_number ORDER BY CAST(t.ticket_number AS UNSIGNED)) as ticket_numbers
          FROM purchases p
          JOIN raffles r ON p.raffle_id = r.id
          LEFT JOIN tickets t ON p.id = t.purchase_id
          WHERE 1=1
        `
        const values: (string | number)[] = []

        if (status !== "all") { query += " AND p.status = ?"; values.push(status) }
        if (raffleId) { query += " AND p.raffle_id = ?"; values.push(Number(raffleId)) }
        if (search && searchType === "all") {
          query += " AND CONCAT(p.customer_name, ' ', p.customer_phone, ' ', p.customer_email, ' ', p.customer_ci, ' ', p.payment_reference) LIKE ?"
          values.push(`%${search}%`)
        } else if (search && searchType) {
          const cols: Record<string, string> = { name: "p.customer_name", phone: "p.customer_phone", email: "p.customer_email", ci: "p.customer_ci", ticket: "t.ticket_number" }
          if (cols[searchType]) { query += ` AND ${cols[searchType]} LIKE ?`; values.push(`%${search}%`) }
        }
        if (start) { query += " AND DATE(p.created_at) >= ?"; values.push(start) }
        if (end) { query += " AND DATE(p.created_at) <= ?"; values.push(end) }

        query += " GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?"
        values.push(limit, (page - 1) * limit)

        const [rows] = await pool.execute(query, values)
        return Response.json({ data: rows })
      },
    },
  },
})

export const PurchaseById = createFileRoute("/api/admin/purchases/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        await requireAdmin(request)
        return Response.json(await getPurchaseById(Number(params.id)))
      },
    },
  },
})

export const PurchaseStatus = createFileRoute("/api/admin/purchases/$id/status")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = await request.json() as { status: string; notes?: string }
        const result = await updatePurchaseStatus(Number(params.id), body.status as never, body.notes)
        return Response.json(result)
      },
    },
  },
})

export const AddTickets = createFileRoute("/api/admin/purchases/$id/tickets/add")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = await request.json() as { quantity: number }
        const result = await addTicketsToPurchase(Number(params.id), body.quantity)
        return Response.json(result)
      },
    },
  },
})

export const RemoveTickets = createFileRoute("/api/admin/purchases/$id/tickets/remove")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const body = await request.json() as { quantity: number }
        const result = await removeTicketsFromPurchase(Number(params.id), body.quantity)
        return Response.json(result)
      },
    },
  },
})

export const Reassign = createFileRoute("/api/admin/purchases/$id/tickets/reassign")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        await requireAdmin(request)
        const result = await reassignTicketsToPurchase(Number(params.id))
        return Response.json(result)
      },
    },
  },
})
