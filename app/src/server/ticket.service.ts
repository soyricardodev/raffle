import { getPool } from "@/lib/db.server"
import { getLogger } from "@/lib/logger"
import { InsufficientTicketsError, ConcurrentPurchaseError } from "@raffle/shared/errors"
import type { TicketStatus } from "@raffle/shared/validators"

const TICKET_POOL_SIZE = 10000
const logger = getLogger()

// ─── Generation ──────────────────────────────────────────────

export function generateTicketNumbers(total: number, max = TICKET_POOL_SIZE): string[] {
  if (total > max) {
    throw new Error(`Máximo ${max} tickets (rango 0000-${String(max - 1).padStart(4, "0")})`)
  }

  const selected = new Set<string>()
  while (selected.size < total) {
    const num = Math.floor(Math.random() * max)
    selected.add(String(num).padStart(4, "0"))
  }
  return Array.from(selected)
}

/**
 * Inserta los tickets en la BD en lotes de 500.
 */
export async function insertTicketPool(
  raffleId: number,
  ticketNumbers: string[],
): Promise<number> {
  const pool = getPool()
  let inserted = 0
  const BATCH = 500

  for (let i = 0; i < ticketNumbers.length; i += BATCH) {
    const batch = ticketNumbers.slice(i, i + BATCH)
    const placeholders = batch.map(() => "(?, ?, ?)").join(", ")
    const values: (string | number)[] = []
    for (const num of batch) {
      values.push(raffleId, num, "available")
    }

    const [result] = await pool.execute(
      `INSERT INTO tickets (raffle_id, ticket_number, status) VALUES ${placeholders}`,
      values,
    )
    inserted += (result as { affectedRows: number }).affectedRows
  }

  logger.info({ raffleId, count: inserted }, "tickets:pool_created")
  return inserted
}

// ─── Allocation ──────────────────────────────────────────────

/**
 * Reserva `quantity` tickets aleatorios en una transacción atómica.
 * Usa SELECT ... FOR UPDATE para prevenir race conditions.
 *
 * @returns array de números de ticket asignados
 * @throws InsufficientTicketsError si no hay suficientes disponibles
 * @throws ConcurrentPurchaseError si otro request tomó los tickets
 */
export async function allocateRandomTickets(
  raffleId: number,
  quantity: number,
): Promise<string[]> {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    // 1. Lock de la rifa y contar disponibles
    const [[{ available }]] = await conn.query(
      `SELECT COUNT(*) as available FROM tickets
       WHERE raffle_id = ? AND status = 'available'
       FOR UPDATE`,
      [raffleId],
    ) as unknown as [[{ available: number }]]

    if (available < quantity) {
      await conn.rollback()
      throw new InsufficientTicketsError(available, quantity)
    }

    // 2. Seleccionar N tickets aleatorios
    const [ticketRows] = await conn.query(
      `SELECT ticket_number FROM tickets
       WHERE raffle_id = ? AND status = 'available'
       ORDER BY RAND()
       LIMIT ?`,
      [raffleId, quantity],
    ) as unknown as [[{ ticket_number: string }]]

    const ticketNumbers = (ticketRows as { ticket_number: string }[]).map((t) => t.ticket_number)

    // 3. Verificar que obtuvimos la cantidad esperada
    if (ticketNumbers.length < quantity) {
      await conn.rollback()
      throw new InsufficientTicketsError(ticketNumbers.length, quantity)
    }

    // 4. Marcar como reserved (solo sin purchase_id aún — se asigna después)
    //    Esto se hace en PurchaseService al crear la compra
    await conn.commit()

    logger.info({ raffleId, count: ticketNumbers.length }, "tickets:allocated")
    return ticketNumbers
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

/**
 * Asigna los tickets a una compra específica (cambia status + purchase_id).
 * Se llama DESPUÉS de insertar el purchase, dentro de la misma transacción.
 */
export async function assignTicketsToPurchase(
  raffleId: number,
  purchaseId: number,
  ticketNumbers: string[],
  newStatus: TicketStatus = "reserved",
): Promise<void> {
  if (ticketNumbers.length === 0) return

  const pool = getPool()
  const placeholders = ticketNumbers.map(() => "?").join(", ")

  const [result] = await pool.execute(
    `UPDATE tickets
     SET status = ?, purchase_id = ?
     WHERE raffle_id = ?
       AND ticket_number IN (${placeholders})
       AND status = 'available'`,
    [newStatus, purchaseId, raffleId, ...ticketNumbers],
  )

  const updated = (result as { affectedRows: number }).affectedRows
  if (updated !== ticketNumbers.length) {
    throw new ConcurrentPurchaseError(
      ticketNumbers.filter((_, i) => i >= updated),
    )
  }

  logger.info({ raffleId, purchaseId, count: updated }, "tickets:assigned")
}

// ─── Release ─────────────────────────────────────────────────

/**
 * Libera tickets (reject / remove tickets).
 */
export async function releaseTickets(
  ticketNumbers: string[],
  raffleId: number,
): Promise<number> {
  if (ticketNumbers.length === 0) return 0

  const pool = getPool()
  const placeholders = ticketNumbers.map(() => "?").join(", ")

  const [result] = await pool.execute(
    `UPDATE tickets
     SET status = 'available', purchase_id = NULL
     WHERE raffle_id = ?
       AND ticket_number IN (${placeholders})`,
    [raffleId, ...ticketNumbers],
  )

  const count = (result as { affectedRows: number }).affectedRows
  logger.info({ raffleId, count }, "tickets:released")
  return count
}

/**
 * Libera TODOS los tickets de una compra.
 */
export async function releasePurchaseTickets(purchaseId: number): Promise<number> {
  const pool = getPool()
  const [result] = await pool.execute(
    `UPDATE tickets
     SET status = 'available', purchase_id = NULL
     WHERE purchase_id = ?`,
    [purchaseId],
  )
  return (result as { affectedRows: number }).affectedRows
}

// ─── Queries ─────────────────────────────────────────────────

/**
 * Obtiene los números de ticket de una compra.
 */
export async function getPurchaseTicketNumbers(purchaseId: number): Promise<string[]> {
  const pool = getPool()
  const [rows] = await pool.execute(
    `SELECT ticket_number FROM tickets WHERE purchase_id = ? ORDER BY CAST(ticket_number AS UNSIGNED)`,
    [purchaseId],
  )
  return (rows as { ticket_number: string }[]).map((r) => r.ticket_number)
}

/**
 * Cuenta tickets disponibles para una rifa.
 */
export async function countAvailableTickets(raffleId: number): Promise<number> {
  const [result] = await getPool().execute(
    `SELECT COUNT(*) as count FROM tickets
     WHERE raffle_id = ? AND status = 'available'`,
    [raffleId],
  )
  return (result as [{ count: number }])[0].count
}
