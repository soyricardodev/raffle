import { getLogger } from "@/lib/logger"
import { processPausedRaffles } from "./pause.service"
import * as rafflesRepo from "./repositories/raffles.repository"

const logger = getLogger()

export async function finalizeExpiredRaffles(): Promise<{ finalized: number }> {
  const finalized = await rafflesRepo.finalizeExpiredRaffles()
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
