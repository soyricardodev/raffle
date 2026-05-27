import { getLogger } from "@/lib/logger"
import { getPool } from "@/lib/db.server"
import { processPausedRaffles } from "./pause.service"

const logger = getLogger()

/** Finaliza rifas cuyo sorteo venció (offset 4h como legacy). */
export async function finalizeExpiredRaffles(): Promise<{ finalized: number }> {
  const pool = getPool()
  const [result] = await pool.execute(
    `UPDATE raffles
     SET status = 'finished', updated_at = CURRENT_TIMESTAMP
     WHERE status IN ('active', 'paused')
       AND draw_date IS NOT NULL
       AND draw_date <= DATE_SUB(NOW(), INTERVAL 4 HOUR)`,
  )
  const finalized = (result as { affectedRows: number }).affectedRows ?? 0
  if (finalized > 0) {
    logger.info({ finalized }, "scheduler:raffles_finalized")
  }
  return { finalized }
}

export async function runMaintenanceJobs(): Promise<{
  paused: Awaited<ReturnType<typeof processPausedRaffles>>
  finalized: Awaited<ReturnType<typeof finalizeExpiredRaffles>>
}> {
  const paused = await processPausedRaffles()
  const finalized = await finalizeExpiredRaffles()
  logger.info({ paused, finalized }, "scheduler:maintenance_complete")
  return { paused, finalized }
}
