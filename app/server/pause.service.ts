import { getPool } from "@/lib/db.server"
import { getLogger } from "@/lib/logger"
import type { PauseReason } from "@raffle/shared/validators"

const logger = getLogger()

const PAUSE_DURATION_MINUTES = 15

export interface Availability {
  total: number
  available: number
  sold: number
  reserved: number
  unavailable: number
  isFull: boolean
}

export interface PauseInfo {
  status: string
  isPaused: boolean
  pauseUntil: Date | null
  pauseReason: PauseReason | null
  autoPauseEnabled: boolean
  remainingSeconds: number
  hasTimer: boolean
  minPurchase: number
  availability: Availability
  pauseContext: {
    title: string
    description: string
  } | null
}

// ─── Availability ────────────────────────────────────────────

export async function checkTicketAvailability(raffleId: number): Promise<Availability> {
  const pool = getPool()
  const [rows] = await pool.execute(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
       SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
       SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved
     FROM tickets
     WHERE raffle_id = ?`,
    [raffleId],
  )

  const r: Record<string, number> = (rows as Record<string, number>[])[0] ?? {}
  const available = Number(r.available) || 0
  const sold = Number(r.sold) || 0
  const reserved = Number(r.reserved) || 0
  const total = Number(r.total) || 0
  const unavailable = sold + reserved

  return {
    total,
    available,
    sold,
    reserved,
    unavailable,
    isFull: unavailable >= total,
  }
}

// ─── Auto-pause check ────────────────────────────────────────

export interface AutoPauseResult {
  needsPause: boolean
  reason: string
  pauseType?: PauseReason
  availability?: Availability
  minPurchase?: number
}

export async function checkAutoPause(raffleId: number): Promise<AutoPauseResult> {
  const pool = getPool()

  const [raffleRows] = await pool.execute(
    `SELECT id, name, status, auto_pause_enabled, min_purchase FROM raffles
     WHERE id = ? AND status = 'active'`,
    [raffleId],
  )

  const raffle = (raffleRows as Record<string, unknown>[])[0]
  if (!raffle) {
    return { needsPause: false, reason: "Rifa no activa o no encontrada" }
  }

  if (!raffle.auto_pause_enabled) {
    return { needsPause: false, reason: "Pausa automática deshabilitada" }
  }

  const availability = await checkTicketAvailability(raffleId)
  const minPurchase = Number(raffle.min_purchase) || 1

  if (availability.isFull) {
    return {
      needsPause: true,
      reason: "Todos los tickets están vendidos o reservados",
      pauseType: "auto_full",
      availability,
      minPurchase,
    }
  }

  if (availability.available < minPurchase) {
    return {
      needsPause: true,
      reason: `Tickets insuficientes (${availability.available} < ${minPurchase})`,
      pauseType: "auto_insufficient",
      availability,
      minPurchase,
    }
  }

  return {
    needsPause: false,
    reason: "Tickets disponibles suficientes",
    availability,
    minPurchase,
  }
}

// ─── Pause / Unpause ─────────────────────────────────────────

export interface PauseResult {
  success: boolean
  pauseUntil?: Date
  reason?: PauseReason
  message?: string
  error?: string
}

export async function pauseRaffle(
  raffleId: number,
  reason: PauseReason = "auto_full",
  durationMinutes: number | null = null,
): Promise<PauseResult> {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const pauseUntil = new Date()
    if (durationMinutes !== null) {
      pauseUntil.setMinutes(pauseUntil.getMinutes() + durationMinutes)
    } else {
      pauseUntil.setMinutes(pauseUntil.getMinutes() + PAUSE_DURATION_MINUTES)
    }

    const [result] = await conn.execute(
      `UPDATE raffles
       SET status = 'paused', pause_until = ?, pause_reason = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'active'`,
      [pauseUntil, reason, raffleId],
    )

    const affected = (result as { affectedRows: number }).affectedRows
    if (affected === 0) {
      await conn.rollback()
      return { success: false, error: "No se pudo pausar la rifa (posiblemente ya no está activa)" }
    }

    await conn.commit()

    const messages: Record<string, string> = {
      manual: "Rifa pausada manualmente",
      auto_insufficient: "Rifa pausada: tickets insuficientes para compra mínima",
      auto_full: "Rifa pausada: todos los tickets están ocupados",
      auto_timeout: "Rifa pausada por timeout",
    }

    logger.info({ raffleId, reason }, "raffle:paused")
    return {
      success: true,
      pauseUntil,
      reason,
      message: messages[reason] ?? `Rifa pausada por ${PAUSE_DURATION_MINUTES} min`,
    }
  } catch (error) {
    await conn.rollback()
    logger.error({ raffleId, err: error }, "raffle:pause_failed")
    return { success: false, error: String(error) }
  } finally {
    conn.release()
  }
}

export async function unpauseRaffle(raffleId: number): Promise<{
  success: boolean
  newStatus?: string
  message?: string
  availability?: Availability
  error?: string
}> {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const [raffleRows] = await conn.execute(
      `SELECT id, name, status, pause_reason, min_purchase FROM raffles
       WHERE id = ? AND status = 'paused'`,
      [raffleId],
    )

    const raffle = (raffleRows as Record<string, unknown>[])[0]
    if (!raffle) {
      await conn.rollback()
      return { success: false, error: "Rifa no encontrada o no está pausada" }
    }

    const availability = await checkTicketAvailability(raffleId)
    const minPurchase = Number(raffle.min_purchase) || 1

    let newStatus = "active"
    let message = "Rifa reactivada exitosamente"

    if (availability.available === 0) {
      newStatus = "finished"
      message = "Rifa finalizada — no hay tickets disponibles"
    } else if (availability.available < minPurchase) {
      newStatus = "finished"
      message = `Rifa finalizada — tickets insuficientes (${availability.available} < ${minPurchase})`
    }

    await conn.execute(
      `UPDATE raffles
       SET status = ?, pause_until = NULL, pause_reason = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newStatus, raffleId],
    )

    await conn.commit()

    logger.info({ raffleId, newStatus }, "raffle:unpaused")
    return { success: true, newStatus, message, availability }
  } catch (error) {
    await conn.rollback()
    logger.error({ raffleId, err: error }, "raffle:unpause_failed")
    return { success: false, error: String(error) }
  } finally {
    conn.release()
  }
}

// ─── Pause info ──────────────────────────────────────────────

export async function getPauseInfo(raffleId: number): Promise<PauseInfo | null> {
  const pool = getPool()
  const [rows] = await pool.execute(
    `SELECT status, pause_until, pause_reason, auto_pause_enabled, min_purchase
     FROM raffles WHERE id = ?`,
    [raffleId],
  )

  const raffle = (rows as Record<string, unknown>[])[0]
  if (!raffle) return null

  const now = new Date()
  const pauseUntil = raffle.pause_until ? new Date(raffle.pause_until as string) : null
  const remainingSeconds = pauseUntil
    ? Math.max(0, Math.floor((pauseUntil.getTime() - now.getTime()) / 1000))
    : 0

  const availability = await checkTicketAvailability(raffleId)

  return {
    status: raffle.status as string,
    isPaused: raffle.status === "paused",
    pauseUntil,
    pauseReason: raffle.pause_reason as PauseReason | null,
    autoPauseEnabled: Boolean(raffle.auto_pause_enabled),
    remainingSeconds,
    hasTimer: Boolean(pauseUntil && remainingSeconds > 0),
    minPurchase: Number(raffle.min_purchase) || 1,
    availability,
    pauseContext: getPauseContext(
      raffle.pause_reason as PauseReason | null,
      availability,
      Number(raffle.min_purchase) || 1,
    ),
  }
}

function getPauseContext(
  pauseReason: PauseReason | null,
  availability: Availability,
  minPurchase: number,
): { title: string; description: string } | null {
  if (!pauseReason) return null

  const contexts: Record<string, { title: string; description: string }> = {
    auto_full: {
      title: "Rifa Completa",
      description: "Todos los boletos están vendidos o reservados",
    },
    auto_insufficient: {
      title: "Boletos Insuficientes",
      description: `Solo quedan ${availability.available} boletos disponibles, pero se necesitan al menos ${minPurchase} para realizar una compra`,
    },
    auto_timeout: {
      title: "Tiempo Agotado",
      description: "La rifa se pausó automáticamente por tiempo",
    },
    manual: {
      title: "Pausa Manual",
      description: "La rifa fue pausada manualmente por un administrador",
    },
  }

  return contexts[pauseReason] ?? {
    title: "Rifa Pausada",
    description: "La rifa se encuentra en pausa temporalmente",
  }
}

// ─── Process expired pauses ──────────────────────────────────

export async function processPausedRaffles(): Promise<{
  success: boolean
  processed: number
  reactivated: number
  finished: number
}> {
  const pool = getPool()

  const [expiredRaffles] = await pool.execute(
    `SELECT id FROM raffles
     WHERE status = 'paused'
       AND pause_until IS NOT NULL
       AND pause_until <= NOW()`,
  )

  const expired = expiredRaffles as { id: number }[]
  if (expired.length === 0) {
    return { success: true, processed: 0, reactivated: 0, finished: 0 }
  }

  let reactivated = 0
  let finished = 0

  for (const { id } of expired) {
    const result = await unpauseRaffle(id)
    if (result.success) {
      if (result.newStatus === "active") reactivated++
      else if (result.newStatus === "finished") finished++
    }
  }

  return { success: true, processed: expired.length, reactivated, finished }
}
