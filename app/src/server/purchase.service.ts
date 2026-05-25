import { getPool } from "@/lib/db.server"
import { getLogger } from "@/lib/logger"
import {
  RaffleNotFoundError,
  RaffleNotActiveError,
  RafflePausedError,
  RaffleFinishedError,
  InsufficientTicketsError,
  PaymentReferenceDuplicateError,
  PurchaseNotFoundError,
  PurchaseNoTicketsError,
  PurchaseRejectedImmutableError,
  InvalidQuantityError,
  ConcurrentPurchaseError,
} from "@raffle/shared/errors"
import {
  isDollarMethod,
  type PaymentMethod,
  type PurchaseStatus,
} from "@raffle/shared/validators"
import * as pauseService from "./pause.service"

const logger = getLogger()

// ─── Create ──────────────────────────────────────────────────

export interface CreatePurchaseParams {
  raffleId: number
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerCi?: string
  customerLocation?: string | null
  paymentMethod: PaymentMethod
  paymentReference: string
  ticketQuantity: number
  paymentProofUrl?: string | null
}

export async function createPurchase(params: CreatePurchaseParams) {
  const {
    raffleId,
    customerName,
    customerPhone,
    customerEmail,
    customerCi,
    customerLocation,
    paymentMethod,
    paymentReference,
    ticketQuantity,
    paymentProofUrl,
  } = params

  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    // 1. Lock raffle row and validate
    const [raffleRows] = await conn.execute(
      `SELECT id, name, status, price_bs, price_usd, min_purchase, max_purchase,
              draw_date, pause_until, auto_pause_enabled
       FROM raffles WHERE id = ? FOR UPDATE`,
      [raffleId],
    )

    const raffleRow = (raffleRows as Record<string, unknown>[])[0]
    if (!raffleRow) {
      await conn.rollback()
      throw new RaffleNotFoundError(raffleId)
    }

    const raffle = {
      id: Number(raffleRow.id),
      status: raffleRow.status as string,
      priceBs: Number(raffleRow.price_bs),
      priceUsd: Number(raffleRow.price_usd),
      minPurchase: Number(raffleRow.min_purchase) || 1,
      maxPurchase: Number(raffleRow.max_purchase) || 10,
      drawDate: raffleRow.draw_date as string | null,
      autoPauseEnabled: Boolean(raffleRow.auto_pause_enabled),
    }

    if (raffle.status === "finished" || raffle.status === "cancelled") {
      await conn.rollback()
      throw new RaffleFinishedError(raffleId)
    }

    if (raffle.status === "paused") {
      const info = await pauseService.getPauseInfo(raffleId)
      await conn.rollback()
      throw new RafflePausedError(raffleId, info ?? undefined)
    }

    if (raffle.drawDate && new Date(raffle.drawDate) <= new Date()) {
      await conn.rollback()
      throw new RaffleFinishedError(raffleId)
    }

    if (raffle.status !== "active") {
      await conn.rollback()
      throw new RaffleNotActiveError(raffleId, raffle.status)
    }

    // 2. Validate purchase limits
    if (ticketQuantity < raffle.minPurchase || ticketQuantity > raffle.maxPurchase) {
      await conn.rollback()
      throw new InvalidQuantityError(raffle.minPurchase, raffle.maxPurchase, ticketQuantity)
    }

    // 3. Check duplicate payment reference
    if (paymentReference?.trim()) {
      const [refRows] = await conn.execute(
        "SELECT id FROM purchases WHERE payment_reference = ? AND raffle_id = ?",
        [paymentReference.trim(), raffleId],
      )
      if ((refRows as unknown[]).length > 0) {
        await conn.rollback()
        throw new PaymentReferenceDuplicateError(paymentReference.trim(), raffleId)
      }
    }

    // 4. Check availability + select random tickets
    const [countResult] = await conn.execute(
      `SELECT COUNT(*) as available FROM tickets
       WHERE raffle_id = ? AND status = 'available' FOR UPDATE`,
      [raffleId],
    )

    const available = Number((countResult as [{ available: number }])[0]!.available)

    if (available < raffle.minPurchase && raffle.autoPauseEnabled) {
      await conn.rollback()
      throw new InsufficientTicketsError(available, ticketQuantity)
    }

    if (available < ticketQuantity) {
      await conn.rollback()
      throw new InsufficientTicketsError(available, ticketQuantity)
    }

    // 5. Select random tickets within transaction
    const [ticketRows] = await conn.execute(
      `SELECT ticket_number FROM tickets
       WHERE raffle_id = ? AND status = 'available'
       ORDER BY RAND()
       LIMIT ? FOR UPDATE`,
      [raffleId, ticketQuantity],
    )

    const ticketNumbers = (ticketRows as { ticket_number: string }[]).map((t) => t.ticket_number)

    if (ticketNumbers.length < ticketQuantity) {
      await conn.rollback()
      throw new InsufficientTicketsError(ticketNumbers.length, ticketQuantity)
    }

    // 6. Calculate amount
    const pricePerTicket = isDollarMethod(paymentMethod) ? raffle.priceUsd : raffle.priceBs
    const totalAmount = pricePerTicket * ticketQuantity

    // 7. Insert purchase
    const [insertResult] = await conn.execute(
      `INSERT INTO purchases
       (raffle_id, customer_name, customer_phone, customer_email, customer_ci,
        customer_location, payment_method, payment_reference, payment_proof_url,
        ticket_quantity, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        raffleId,
        customerName.substring(0, 200),
        customerPhone.substring(0, 20),
        (customerEmail ?? "").substring(0, 100),
        (customerCi ?? "").substring(0, 20),
        customerLocation?.substring(0, 100) ?? null,
        paymentMethod,
        paymentReference.substring(0, 100),
        paymentProofUrl ?? null,
        ticketQuantity,
        totalAmount,
      ],
    )

    const purchaseId = (insertResult as { insertId: number }).insertId

    // 8. Assign tickets
    const placeholders = ticketNumbers.map(() => "?").join(", ")
    const [updateResult] = await conn.execute(
      `UPDATE tickets
       SET status = 'reserved', purchase_id = ?
       WHERE raffle_id = ?
         AND ticket_number IN (${placeholders})
         AND status = 'available'`,
      [purchaseId, raffleId, ...ticketNumbers],
    )

    if ((updateResult as { affectedRows: number }).affectedRows !== ticketNumbers.length) {
      await conn.rollback()
      throw new ConcurrentPurchaseError()
    }

    await conn.commit()

    logger.info({ purchaseId, raffleId, ticketQuantity, paymentMethod }, "purchase:created")

    return {
      purchaseId,
      ticketNumbers: ticketNumbers.sort((a, b) => String(a).localeCompare(String(b))),
      totalAmount,
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// ─── Status update ───────────────────────────────────────────

export async function updatePurchaseStatus(
  purchaseId: number,
  status: PurchaseStatus,
  notes?: string,
) {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const [purchaseRows] = await conn.execute(
      `SELECT p.*, r.status as raffle_status,
              r.auto_pause_enabled, r.pause_reason
       FROM purchases p
       JOIN raffles r ON p.raffle_id = r.id
       WHERE p.id = ? FOR UPDATE`,
      [purchaseId],
    )

    const purchaseRow = (purchaseRows as Record<string, unknown>[])[0]
    if (!purchaseRow) {
      await conn.rollback()
      throw new PurchaseNotFoundError(purchaseId)
    }

    const currentStatus = purchaseRow.status as string
    const raffleId = Number(purchaseRow.raffle_id)

    if (!["pending", "approved", "rejected"].includes(status)) {
      await conn.rollback()
      throw new Error(`Estado inválido: ${status}`)
    }

    if (currentStatus === status) {
      await conn.rollback()
      return { message: `La compra ya está ${status}`, noChange: true }
    }

    if (status === "approved" || status === "rejected") {
      const [ticketCount] = await conn.execute(
        "SELECT COUNT(*) as count FROM tickets WHERE purchase_id = ?",
        [purchaseId],
      )
      if ((ticketCount as { count: number }[])[0]!.count === 0) {
        await conn.rollback()
        throw new PurchaseNoTicketsError(purchaseId)
      }
    }

    await conn.execute(
      "UPDATE purchases SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, notes ?? null, purchaseId],
    )

    const ticketStatus = status === "approved" ? "sold" : status === "rejected" ? "available" : "reserved"

    await conn.execute(
      "UPDATE tickets SET status = ? WHERE purchase_id = ?",
      [ticketStatus, purchaseId],
    )

    if (status === "rejected") {
      await conn.execute(
        "UPDATE tickets SET purchase_id = NULL WHERE purchase_id = ?",
        [purchaseId],
      )
    }

    await conn.commit()

    logger.info({ purchaseId, oldStatus: currentStatus, newStatus: status }, "purchase:status_updated")

    // Post-commit: auto-unpause
    if (status === "rejected") {
      const [raffleInfo] = await pool.execute(
        "SELECT auto_pause_enabled, pause_reason FROM raffles WHERE id = ?",
        [raffleId],
      )
      const info = (raffleInfo as Record<string, unknown>[])[0]
      if (info?.auto_pause_enabled && info.pause_reason === "auto_full") {
        const availability = await pauseService.checkTicketAvailability(raffleId)
        if (availability.available > 0) {
          await pauseService.unpauseRaffle(raffleId)
        }
      }
    }

    return {
      message: `Compra actualizada: ${currentStatus} → ${status}`,
      status,
      previousStatus: currentStatus,
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// ─── Add tickets ──────────────────────────────────────────────

export async function addTicketsToPurchase(purchaseId: number, quantity: number) {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const [purchaseRows] = await conn.execute(
      `SELECT p.*, r.price_bs, r.price_usd
       FROM purchases p
       JOIN raffles r ON p.raffle_id = r.id
       WHERE p.id = ? FOR UPDATE`,
      [purchaseId],
    )

    const purchaseRow = (purchaseRows as Record<string, unknown>[])[0]
    if (!purchaseRow) {
      await conn.rollback()
      throw new PurchaseNotFoundError(purchaseId)
    }

    const raffleId = Number(purchaseRow.raffle_id)
    const purchaseStatus = purchaseRow.status as string
    const paymentMethod = purchaseRow.payment_method as PaymentMethod
    const currentQty = Number(purchaseRow.ticket_quantity)
    const currentTotal = Number(purchaseRow.total_amount)
    const priceBs = Number(purchaseRow.price_bs)
    const priceUsd = Number(purchaseRow.price_usd)

    if (purchaseStatus === "rejected") {
      await conn.rollback()
      throw new PurchaseRejectedImmutableError(purchaseId)
    }

    const [countResult] = await conn.execute(
      `SELECT COUNT(*) as available FROM tickets
       WHERE raffle_id = ? AND status = 'available' FOR UPDATE`,
      [raffleId],
    )

    const available = Number((countResult as [{ available: number }])[0]!.available)

    if (available < quantity) {
      await conn.rollback()
      throw new InsufficientTicketsError(available, quantity)
    }

    const [ticketRows] = await conn.execute(
      `SELECT ticket_number FROM tickets
       WHERE raffle_id = ? AND status = 'available'
       ORDER BY RAND()
       LIMIT ? FOR UPDATE`,
      [raffleId, quantity],
    )

    const ticketNumbers = (ticketRows as { ticket_number: string }[]).map((t) => t.ticket_number)

    if (ticketNumbers.length < quantity) {
      await conn.rollback()
      throw new InsufficientTicketsError(ticketNumbers.length, quantity)
    }

    const dollar = isDollarMethod(paymentMethod)
    const pricePerTicket = dollar ? priceUsd : priceBs
    const additional = pricePerTicket * ticketNumbers.length
    const newQty = currentQty + ticketNumbers.length
    const newTotal = currentTotal + additional

    await conn.execute(
      "UPDATE purchases SET ticket_quantity = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newQty, newTotal, purchaseId],
    )

    const ticketStatus = purchaseStatus === "approved" ? "sold" : "reserved"
    const placeholders = ticketNumbers.map(() => "?").join(", ")
    await conn.execute(
      `UPDATE tickets SET status = ?, purchase_id = ?
       WHERE raffle_id = ? AND ticket_number IN (${placeholders}) AND status = 'available'`,
      [ticketStatus, purchaseId, raffleId, ...ticketNumbers],
    )

    await conn.commit()

    logger.info({ purchaseId, added: ticketNumbers.length, newQty }, "purchase:tickets_added")

    return {
      addedTickets: ticketNumbers.sort((a, b) => String(a).localeCompare(String(b))),
      newQuantity: newQty,
      newTotalAmount: newTotal,
      additionalAmount: additional,
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// ─── Remove tickets ──────────────────────────────────────────

export async function removeTicketsFromPurchase(purchaseId: number, quantity: number) {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const [purchaseRows] = await conn.execute(
      `SELECT p.*, r.price_bs, r.price_usd
       FROM purchases p
       JOIN raffles r ON p.raffle_id = r.id
       WHERE p.id = ? FOR UPDATE`,
      [purchaseId],
    )

    const purchaseRow = (purchaseRows as Record<string, unknown>[])[0]
    if (!purchaseRow) {
      await conn.rollback()
      throw new PurchaseNotFoundError(purchaseId)
    }

    const raffleId = Number(purchaseRow.raffle_id)
    const purchaseStatus = purchaseRow.status as string
    const paymentMethod = purchaseRow.payment_method as PaymentMethod
    const currentQty = Number(purchaseRow.ticket_quantity)
    const currentTotal = Number(purchaseRow.total_amount)
    const priceBs = Number(purchaseRow.price_bs)
    const priceUsd = Number(purchaseRow.price_usd)

    if (purchaseStatus === "rejected") {
      await conn.rollback()
      throw new PurchaseRejectedImmutableError(purchaseId)
    }

    if (quantity >= currentQty) {
      await conn.rollback()
      throw new Error("No se pueden eliminar todos los boletos. Debe quedar al menos 1.")
    }

    const [ticketRows] = await conn.execute(
      `SELECT ticket_number FROM tickets
       WHERE purchase_id = ?
       ORDER BY RAND()
       LIMIT ?`,
      [purchaseId, quantity],
    )

    const ticketNumbers = (ticketRows as { ticket_number: string }[]).map((t) => t.ticket_number)

    if (ticketNumbers.length === 0) {
      await conn.rollback()
      throw new Error("No se encontraron boletos para eliminar en esta compra")
    }

    const dollar = isDollarMethod(paymentMethod)
    const pricePerTicket = dollar ? priceUsd : priceBs
    const deduction = pricePerTicket * ticketNumbers.length
    const newQty = currentQty - ticketNumbers.length
    const newTotal = currentTotal - deduction

    await conn.execute(
      "UPDATE purchases SET ticket_quantity = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newQty, newTotal, purchaseId],
    )

    const placeholders = ticketNumbers.map(() => "?").join(", ")
    await conn.execute(
      `UPDATE tickets SET status = 'available', purchase_id = NULL
       WHERE purchase_id = ? AND ticket_number IN (${placeholders})`,
      [purchaseId, ...ticketNumbers],
    )

    await conn.commit()

    logger.info({ purchaseId, removed: ticketNumbers.length, newQty }, "purchase:tickets_removed")

    // Post-commit auto-unpause
    const [raffleInfo] = await pool.execute(
      "SELECT auto_pause_enabled, pause_reason FROM raffles WHERE id = ?",
      [raffleId],
    )
    const info = (raffleInfo as Record<string, unknown>[])[0]
    if (info?.auto_pause_enabled && info.pause_reason === "auto_full") {
      const availability = await pauseService.checkTicketAvailability(raffleId)
      if (availability.available > 0) {
        await pauseService.unpauseRaffle(raffleId)
      }
    }

    return {
      removedTickets: ticketNumbers,
      newQuantity: newQty,
      newTotalAmount: newTotal,
      deductedAmount: deduction,
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// ─── Reassign ────────────────────────────────────────────────

export async function reassignTicketsToPurchase(purchaseId: number) {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const [purchaseRows] = await conn.execute(
      `SELECT p.*, r.price_bs, r.price_usd
       FROM purchases p
       JOIN raffles r ON p.raffle_id = r.id
       WHERE p.id = ? AND p.status = 'rejected' FOR UPDATE`,
      [purchaseId],
    )

    const purchaseRow = (purchaseRows as Record<string, unknown>[])[0]
    if (!purchaseRow) {
      await conn.rollback()
      throw new PurchaseNotFoundError(purchaseId)
    }

    const qty = Number(purchaseRow.ticket_quantity)
    const raffleId = Number(purchaseRow.raffle_id)
    const paymentMethod = purchaseRow.payment_method as PaymentMethod
    const priceBs = Number(purchaseRow.price_bs)
    const priceUsd = Number(purchaseRow.price_usd)
    const dollar = isDollarMethod(paymentMethod)
    const pricePerTicket = dollar ? priceUsd : priceBs

    const [ticketRows] = await conn.execute(
      `SELECT ticket_number FROM tickets
       WHERE raffle_id = ? AND status = 'available'
       ORDER BY RAND()
       LIMIT ? FOR UPDATE`,
      [raffleId, qty],
    )

    const ticketNumbers = (ticketRows as { ticket_number: string }[]).map((t) => t.ticket_number)

    if (ticketNumbers.length === 0) {
      await conn.rollback()
      throw new InsufficientTicketsError(0, qty)
    }

    const newTotal = pricePerTicket * ticketNumbers.length

    await conn.execute(
      "UPDATE purchases SET ticket_quantity = ?, total_amount = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [ticketNumbers.length, newTotal, purchaseId],
    )

    const placeholders = ticketNumbers.map(() => "?").join(", ")
    await conn.execute(
      `UPDATE tickets SET status = 'reserved', purchase_id = ?
       WHERE raffle_id = ? AND ticket_number IN (${placeholders}) AND status = 'available'`,
      [purchaseId, raffleId, ...ticketNumbers],
    )

    await conn.commit()

    logger.info({ purchaseId, reassigned: ticketNumbers.length }, "purchase:reassigned")

    return {
      purchaseId,
      ticketNumbers: ticketNumbers.sort((a, b) => String(a).localeCompare(String(b))),
      newQuantity: ticketNumbers.length,
      newTotalAmount: newTotal,
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// ─── Queries ─────────────────────────────────────────────────

export interface ListAdminPurchasesParams {
  limit: number
  page: number
  status?: string
  raffleId?: string | null
  search?: string | null
  searchType?: string
  start?: string | null
  end?: string | null
}

export async function listAdminPurchases(params: ListAdminPurchasesParams) {
  const pool = getPool()
  const { limit, page, status = "all", raffleId, search, searchType = "all", start, end } = params

  let query = `
    SELECT p.*, r.name as raffle_name,
           GROUP_CONCAT(t.ticket_number ORDER BY CAST(t.ticket_number AS UNSIGNED)) as ticket_numbers
    FROM purchases p
    JOIN raffles r ON p.raffle_id = r.id
    LEFT JOIN tickets t ON p.id = t.purchase_id
    WHERE 1=1
  `
  const values: (string | number)[] = []

  if (status !== "all") {
    query += " AND p.status = ?"
    values.push(status)
  }
  if (raffleId) {
    query += " AND p.raffle_id = ?"
    values.push(Number(raffleId))
  }
  if (search && searchType === "all") {
    query +=
      " AND CONCAT(p.customer_name, ' ', p.customer_phone, ' ', p.customer_email, ' ', p.customer_ci, ' ', p.payment_reference) LIKE ?"
    values.push(`%${search}%`)
  } else if (search && searchType) {
    const cols: Record<string, string> = {
      name: "p.customer_name",
      phone: "p.customer_phone",
      email: "p.customer_email",
      ci: "p.customer_ci",
      ticket: "t.ticket_number",
    }
    if (cols[searchType]) {
      query += ` AND ${cols[searchType]} LIKE ?`
      values.push(`%${search}%`)
    }
  }
  if (start) {
    query += " AND DATE(p.created_at) >= ?"
    values.push(start)
  }
  if (end) {
    query += " AND DATE(p.created_at) <= ?"
    values.push(end)
  }

  query += " GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?"
  values.push(limit, (page - 1) * limit)

  const [rows] = await pool.execute(query, values)
  return { data: rows }
}

export async function getPurchaseById(purchaseId: number) {
  const pool = getPool()

  const [rows] = await pool.execute(
    `SELECT p.*, r.name as raffle_name
     FROM purchases p
     JOIN raffles r ON p.raffle_id = r.id
     WHERE p.id = ?`,
    [purchaseId],
  )

  const purchase = (rows as Record<string, unknown>[])[0]
  if (!purchase) throw new PurchaseNotFoundError(purchaseId)

  const [ticketRows] = await pool.execute(
    `SELECT ticket_number FROM tickets WHERE purchase_id = ? ORDER BY CAST(ticket_number AS UNSIGNED)`,
    [purchaseId],
  )

  return {
    ...purchase,
    ticketNumbers: (ticketRows as { ticket_number: string }[]).map((t) => t.ticket_number),
  }
}

export async function getClientPurchases(params: {
  status?: string
  raffleId?: number
  limit?: number
}) {
  const pool = getPool()
  const { status, raffleId, limit = 10 } = params

  let query = `
    SELECT
      p.raffle_id, p.customer_name, p.customer_ci, p.customer_phone, p.customer_email,
      SUM(p.ticket_quantity) as ticket_quantity,
      COUNT(DISTINCT p.id) as purchases,
      SUM(p.total_amount) as total
    FROM purchases p
    JOIN raffles r ON p.raffle_id = r.id
    WHERE 1=1
  `
  const values: (string | number | boolean | null)[] = []
  if (status) { query += " AND p.status = ?"; values.push(status) }
  if (raffleId) { query += " AND p.raffle_id = ?"; values.push(raffleId) }
  query += " GROUP BY p.customer_ci ORDER BY total DESC LIMIT ?"
  values.push(limit)

  const [rows] = await pool.execute(query, values)
  return rows as Record<string, unknown>[]
}
