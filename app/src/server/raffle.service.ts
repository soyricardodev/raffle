import { getPool } from "@/lib/db.server"
import { getLogger } from "@/lib/logger"
import {
  RaffleNotFoundError,
  RaffleHasPurchasesError,
  RaffleNotActiveError,
} from "@raffle/shared/errors"
import type { CreateRaffleInput, PaymentMethod, UpdateRaffleInput } from "@raffle/shared/validators"
import { generateTicketNumbers, insertTicketPool } from "./ticket.service"
import { checkTicketAvailability } from "./pause.service"

const logger = getLogger()

type SqlValue = string | number | boolean | null

type RaffleRow = {
  id: number
  name: string
  description: string | null
  image_url: string | null
  total_tickets: number
  price_bs: string
  price_usd: string
  min_purchase: number
  max_purchase: number
  draw_date: string | null
  days_for_draw: number | null
  status: string
  pause_until: string | null
  pause_reason: string | null
  auto_pause_enabled: number
  publish: number
  created_at: string
  updated_at: string
}

type PrizeRow = {
  name: string
  description: string | null
  image_url: string | null
  position: number
}

export type EnrichedRaffle = RaffleRow & {
  prizes: PrizeRow[]
  payment_methods: { method_type: PaymentMethod; account_info: string; is_active: boolean; min_tickets: number | null }[]
  tickets_sold: number
  tickets_available: number
  tickets_reserved: number
  sold_percentage: string
  days_remaining: number | null
}

// ─── Queries ─────────────────────────────────────────────────

export async function getAllRaffles(params: {
  status?: string
  limit?: number
  page?: number
}) {
  const pool = getPool()
  const { status, limit, page } = params

  let query = "SELECT * FROM raffles"
  const values: SqlValue[] = []

  if (status && status !== "all") {
    const statusList = status.split(",").map((s) => s.trim()).filter(Boolean)
    if (statusList.length > 0) {
      query += ` WHERE status IN (${statusList.map(() => "?").join(",")})`
      for (const s of statusList) values.push(s)
    }
  }

  query += " ORDER BY created_at DESC"

  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 10
  const safePage = page && page > 0 ? page : 1
  const offset = (safePage - 1) * safeLimit
  query += " LIMIT ? OFFSET ?"
  values.push(safeLimit, offset)

  const [rows] = await pool.execute(query, values)

  const raffleList = rows as RaffleRow[]
  const enriched = await Promise.all(
    raffleList.map(async (r) => {
      const av = await checkTicketAvailability(Number(r.id))
      return {
        ...r,
        tickets_sold: av.sold,
        tickets_available: av.available,
        tickets_reserved: av.reserved,
        sold_percentage: av.total > 0 ? ((av.sold / av.total) * 100).toFixed(2) : "0.00",
      }
    }),
  )
  return enriched
}

async function enrichRaffleDetail(
  raffleRow: RaffleRow,
  options?: { includeInactivePaymentMethods?: boolean },
): Promise<EnrichedRaffle> {
  const id = raffleRow.id
  const pool = getPool()

  const [prizes] = await pool.execute("SELECT * FROM prizes WHERE raffle_id = ? ORDER BY position", [id])
  const paySql = options?.includeInactivePaymentMethods
    ? "SELECT * FROM payment_methods WHERE raffle_id = ?"
    : "SELECT * FROM payment_methods WHERE raffle_id = ? AND is_active = true"
  const [payMethods] = await pool.execute(paySql, [id])

  const av = await checkTicketAvailability(id)
  const totalTickets = raffleRow.total_tickets

  return {
    ...raffleRow,
    prizes: (prizes as Record<string, unknown>[]).map((p) => ({
      name: p.name as string,
      description: p.description as string | null,
      image_url: p.image_url as string | null,
      position: p.position as number,
    })),
    payment_methods: (payMethods as Record<string, unknown>[]).map((pm) => ({
      method_type: pm.method_type as PaymentMethod,
      account_info: pm.account_info as string,
      is_active: Boolean(pm.is_active),
      min_tickets: pm.min_tickets as number | null,
    })),
    tickets_sold: av.sold,
    tickets_available: av.available,
    tickets_reserved: av.reserved,
    sold_percentage: totalTickets > 0 ? ((av.sold / totalTickets) * 100).toFixed(2) : "0.00",
    days_remaining: raffleRow.draw_date
      ? Math.ceil((new Date(raffleRow.draw_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  }
}

export async function getRaffleById(
  id: number,
  options?: { includeInactivePaymentMethods?: boolean },
): Promise<EnrichedRaffle> {
  const pool = getPool()

  const [raffleRows] = await pool.execute("SELECT * FROM raffles WHERE id = ?", [id])
  const raffleRow = (raffleRows as RaffleRow[])[0]
  if (!raffleRow) throw new RaffleNotFoundError(id)

  return enrichRaffleDetail(raffleRow, options)
}

export async function findFirstActiveRaffle(): Promise<EnrichedRaffle | null> {
  const pool = getPool()

  const [raffleRows] = await pool.execute(
    "SELECT * FROM raffles WHERE status IN ('active', 'paused') ORDER BY created_at DESC LIMIT 1",
  )

  const raffleRow = (raffleRows as RaffleRow[])[0]
  if (!raffleRow) return null

  return enrichRaffleDetail(raffleRow)
}

export async function getFirstActiveRaffle(): Promise<EnrichedRaffle> {
  const raffle = await findFirstActiveRaffle()
  if (!raffle) throw new RaffleNotFoundError("first-active")
  return raffle
}

// ─── Mutations ───────────────────────────────────────────────

export async function createRaffle(input: CreateRaffleInput) {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const [result] = await conn.execute(
      `INSERT INTO raffles
       (name, description, total_tickets, price_bs, price_usd,
        min_purchase, max_purchase, draw_date,
        days_for_draw, status, auto_pause_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.description ?? null,
        input.total_tickets,
        input.price_bs,
        input.price_usd,
        input.min_purchase ?? 1,
        input.max_purchase ?? 10,
        input.draw_date ?? null,
        input.days_for_draw ?? null,
        input.status ?? "draft",
        input.auto_pause_enabled ?? true,
      ],
    )

    const raffleId = (result as { insertId: number }).insertId

    if (input.total_tickets > 0) {
      const numbers = generateTicketNumbers(input.total_tickets)
      await insertTicketPool(raffleId, numbers)
    }

    if (input.prizes?.length) {
      for (let i = 0; i < input.prizes.length; i++) {
        const p = input.prizes[i]!
        await conn.execute(
          "INSERT INTO prizes (raffle_id, name, description, image_url, position) VALUES (?, ?, ?, ?, ?)",
          [raffleId, p.name, p.description ?? "", p.image_url ?? null, p.position ?? i + 1],
        )
      }
    }

    if (input.payment_methods?.length) {
      for (const pm of input.payment_methods) {
        await conn.execute(
          "INSERT INTO payment_methods (raffle_id, method_type, account_info, is_active, min_tickets) VALUES (?, ?, ?, ?, ?)",
          [raffleId, pm.method_type, JSON.stringify(pm.account_info), true, pm.min_tickets ?? null],
        )
      }
    }

    await conn.commit()
    logger.info({ raffleId, name: input.name }, "raffle:created")
    return { raffleId }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

export async function updateRaffle(id: number, input: UpdateRaffleInput) {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const fields: string[] = []
    const values: SqlValue[] = []

    const allowedFields: (keyof UpdateRaffleInput)[] = [
      "name", "description", "price_bs", "price_usd",
      "min_purchase", "max_purchase", "draw_date",
      "status", "auto_pause_enabled",
    ]

    for (const field of allowedFields) {
      if (input[field] !== undefined) {
        fields.push(`${field} = ?`)
        values.push(input[field] as SqlValue)
      }
    }

    if (fields.length > 0) {
      fields.push("updated_at = CURRENT_TIMESTAMP")
      values.push(id)

      const [result] = await conn.execute(
        `UPDATE raffles SET ${fields.join(", ")} WHERE id = ?`,
        values,
      )

      if ((result as { affectedRows: number }).affectedRows === 0) {
        await conn.rollback()
        throw new RaffleNotFoundError(id)
      }
    }

    if (input.prizes) {
      await conn.execute("DELETE FROM prizes WHERE raffle_id = ?", [id])
      for (let i = 0; i < input.prizes.length; i++) {
        const p = input.prizes[i]!
        await conn.execute(
          "INSERT INTO prizes (raffle_id, name, description, image_url, position) VALUES (?, ?, ?, ?, ?)",
          [id, p.name, p.description ?? "", p.image_url ?? null, p.position ?? i + 1],
        )
      }
    }

    if (input.payment_methods) {
      await conn.execute("DELETE FROM payment_methods WHERE raffle_id = ?", [id])
      for (const pm of input.payment_methods) {
        await conn.execute(
          "INSERT INTO payment_methods (raffle_id, method_type, account_info, is_active, min_tickets) VALUES (?, ?, ?, ?, ?)",
          [
            id,
            pm.method_type,
            JSON.stringify(pm.account_info),
            pm.is_active ?? true,
            pm.min_tickets ?? null,
          ],
        )
      }
    }

    await conn.commit()
    logger.info({ raffleId: id }, "raffle:updated")
    return { raffleId: id }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

export async function deleteRaffle(id: number) {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const [raffleRows] = await conn.execute("SELECT name FROM raffles WHERE id = ?", [id])
    const raffle = (raffleRows as { name: string }[])[0]
    if (!raffle) {
      await conn.rollback()
      throw new RaffleNotFoundError(id)
    }

    const [purchaseRows] = await conn.execute(
      "SELECT COUNT(*) as count FROM purchases WHERE raffle_id = ?",
      [id],
    )
    const count = (purchaseRows as { count: number }[])[0]!.count
    if (count > 0) {
      await conn.rollback()
      throw new RaffleHasPurchasesError(id, count)
    }

    await conn.execute("DELETE FROM raffles WHERE id = ?", [id])
    await conn.commit()

    logger.info({ raffleId: id, name: raffle.name }, "raffle:deleted")
    return { deletedId: id, name: raffle.name }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

export async function publishRaffle(id: number, publish: boolean) {
  const pool = getPool()

  const [raffleRows] = await pool.execute("SELECT id, status, publish FROM raffles WHERE id = ?", [id])
  const raffle = (raffleRows as { id: number; status: string; publish: boolean }[])[0]
  if (!raffle) throw new RaffleNotFoundError(id)
  if (raffle.status !== "finished") throw new RaffleNotActiveError(id, raffle.status)

  if (raffle.publish === publish) {
    return { message: `La rifa ya está ${publish ? "" : "des"}publicada`, raffleId: id }
  }

  await pool.execute("UPDATE raffles SET publish = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
    publish ? 1 : 0,
    id,
  ])

  logger.info({ raffleId: id, publish }, "raffle:published")
  return { message: `Rifa ${publish ? "" : "des"}publicada exitosamente`, raffleId: id }
}

export async function setAutoPauseEnabled(id: number, enabled: boolean) {
  const pool = getPool()

  await pool.execute(
    "UPDATE raffles SET auto_pause_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [enabled ? 1 : 0, id],
  )

  return { autoPauseEnabled: enabled }
}

export async function getPublishedRaffles(limit: number, page: number) {
  const pool = getPool()
  const safeLimit = Math.min(limit ?? 10, 100)
  const safePage = Math.max(page ?? 1, 1)

  const [rows] = await pool.execute(
    "SELECT * FROM raffles WHERE publish = true AND status = 'finished' ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [safeLimit, (safePage - 1) * safeLimit],
  )

  const raffleList = rows as RaffleRow[]
  const enriched = await Promise.all(
    raffleList.map(async (r) => {
      const av = await checkTicketAvailability(r.id)
      const total = r.total_tickets
      return {
        id: r.id,
        name: r.name,
        tickets_sold: av.sold,
        total_tickets: total,
        sold_percentage: total > 0 ? ((av.sold / total) * 100).toFixed(2) : "0.00",
      }
    }),
  )
  return { raffles: enriched, totalRows: enriched.length }
}

export async function getDashboardStats(raffleId?: number) {
  const pool = getPool()
  const purchaseWhere = raffleId ? "WHERE raffle_id = ?" : ""
  const purchaseParams: SqlValue[] = raffleId ? [raffleId] : []

  const [raffleStats] = await pool.execute(
    `SELECT
       COUNT(*) as total_raffles,
       SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_raffles,
       SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) as finished_raffles
     FROM raffles`,
  )

  const ticketWhere = raffleId
    ? "WHERE t.raffle_id = ?"
    : "JOIN raffles r ON t.raffle_id = r.id WHERE r.status = 'active'"
  const ticketParams: SqlValue[] = raffleId ? [raffleId] : []

  const [ticketStats] = await pool.execute(
    `SELECT
       COUNT(t.id) as total_tickets,
       SUM(CASE WHEN t.status = 'sold' THEN 1 ELSE 0 END) as sold_tickets,
       SUM(CASE WHEN t.status = 'reserved' THEN 1 ELSE 0 END) as reserved_tickets
     FROM tickets t
     ${ticketWhere}`,
    ticketParams,
  )

  const [salesStats] = await pool.execute(
    `SELECT
       COUNT(*) as total_sales,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_sales,
       SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_sales,
       COALESCE(SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END), 0) as total_revenue
     FROM purchases
     ${purchaseWhere}`,
    purchaseParams,
  )

  const [revenueByMethod] = await pool.execute(
    `SELECT payment_method as method,
            COUNT(*) as count,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END), 0) as revenue
     FROM purchases
     ${purchaseWhere}
     GROUP BY payment_method
     ORDER BY revenue DESC`,
    purchaseParams,
  )

  const [userStats] = await pool.execute(
    `SELECT
       COUNT(DISTINCT customer_phone) as total_customers,
       COUNT(DISTINCT CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN customer_phone END) as new_customers
     FROM purchases
     ${purchaseWhere}`,
    purchaseParams,
  )

  const recentLimit = 10
  const recentQuery = raffleId
    ? `SELECT p.*, r.name as raffle_name FROM purchases p
       JOIN raffles r ON p.raffle_id = r.id WHERE p.raffle_id = ? ORDER BY p.created_at DESC LIMIT ${recentLimit}`
    : `SELECT p.*, r.name as raffle_name FROM purchases p
       JOIN raffles r ON p.raffle_id = r.id ORDER BY p.created_at DESC LIMIT ${recentLimit}`
  const recentParams: SqlValue[] = raffleId ? [raffleId] : []

  const [recentSales] = await pool.execute(recentQuery, recentParams)

  const [activeRaffles] = await pool.execute(
    `SELECT id, name FROM raffles WHERE status IN ('active', 'paused') ORDER BY created_at DESC`,
  )

  return {
    raffles: (raffleStats as Record<string, number>[])[0] ?? {},
    tickets: (ticketStats as Record<string, number>[])[0] ?? {},
    sales: (salesStats as Record<string, number>[])[0] ?? {},
    users: (userStats as Record<string, number>[])[0] ?? {},
    revenue_by_method: revenueByMethod,
    active_raffles: activeRaffles,
    recent_sales: recentSales,
    filtered_raffle_id: raffleId ?? null,
  }
}
