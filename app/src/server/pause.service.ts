import { getLogger } from "@/lib/logger"
import { getDb, withImmediateTransaction } from "@/lib/db.server"
import { raffles } from "@raffle/shared/db"
import type { PauseReason, RaffleStatus } from "@raffle/shared/validators"
import { and, eq, lte } from "drizzle-orm"
import * as rafflesRepo from "./repositories/raffles.repository"
import type { RaffleLiveRow } from "./repositories/raffles.repository"
import { getRaffleLiveActivity, type PublicRecentPurchase } from "./live-activity.service"

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

export async function checkTicketAvailability(raffleId: number): Promise<Availability> {
  const row = await rafflesRepo.findRaffleById(raffleId)
  if (!row) {
    return { total: 0, available: 0, sold: 0, reserved: 0, unavailable: 0, isFull: true }
  }
  return rafflesRepo.raffleAvailabilityFromCounters(row)
}

export interface AutoPauseResult {
  needsPause: boolean
  reason: string
  pauseType?: PauseReason
  availability?: Availability
  minPurchase?: number
}

export async function checkAutoPause(raffleId: number): Promise<AutoPauseResult> {
  const raffle = await rafflesRepo.findRaffleById(raffleId)
  if (!raffle || raffle.status !== "active") {
    return { needsPause: false, reason: "Rifa no activa o no encontrada" }
  }

  if (!raffle.autoPauseEnabled) {
    return { needsPause: false, reason: "Pausa automática deshabilitada" }
  }

  const availability = rafflesRepo.raffleAvailabilityFromCounters(raffle)
  const minPurchase = raffle.minPurchase

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
  try {
    const pauseUntil = new Date()
    const minutes = durationMinutes ?? PAUSE_DURATION_MINUTES
    pauseUntil.setMinutes(pauseUntil.getMinutes() + minutes)

    const success = await withImmediateTransaction((tx) =>
      rafflesRepo.pauseRaffleRow(tx, raffleId, pauseUntil, reason),
    )

    if (!success) {
      return { success: false, error: "No se pudo pausar la rifa (posiblemente ya no está activa)" }
    }

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
    logger.error({ raffleId, err: error }, "raffle:pause_failed")
    return { success: false, error: String(error) }
  }
}

export async function unpauseRaffle(raffleId: number): Promise<{
  success: boolean
  newStatus?: string
  message?: string
  availability?: Availability
  error?: string
}> {
  try {
    const raffle = await rafflesRepo.findRaffleById(raffleId)
    if (!raffle || raffle.status !== "paused") {
      return { success: false, error: "Rifa no encontrada o no está pausada" }
    }

    const availability = rafflesRepo.raffleAvailabilityFromCounters(raffle)
    const minPurchase = raffle.minPurchase

    let newStatus: RaffleStatus = "active"
    let message = "Rifa reactivada exitosamente"

    if (availability.available === 0) {
      newStatus = "finished"
      message = "Rifa finalizada — no hay tickets disponibles"
    } else if (availability.available < minPurchase) {
      newStatus = "finished"
      message = `Rifa finalizada — tickets insuficientes (${availability.available} < ${minPurchase})`
    }

    await withImmediateTransaction((tx) =>
      rafflesRepo.unpauseRaffleRow(tx, raffleId, newStatus),
    )

    logger.info({ raffleId, newStatus }, "raffle:unpaused")
    return { success: true, newStatus, message, availability }
  } catch (error) {
    logger.error({ raffleId, err: error }, "raffle:unpause_failed")
    return { success: false, error: String(error) }
  }
}

export type RaffleLiveCoreSnapshot = {
  status: string
  isPaused: boolean
  remainingSeconds: number
  pauseReason: PauseReason | null
  pauseContext: PauseInfo["pauseContext"]
  minPurchase: number
  availability: Availability
}

export type RaffleLiveSnapshot = RaffleLiveCoreSnapshot & {
  activeBuyersCount: number
  recentPurchases: PublicRecentPurchase[]
}

function remainingPauseSeconds(pauseUntil: Date | null): number {
  return pauseUntil ? Math.max(0, Math.floor((pauseUntil.getTime() - Date.now()) / 1000)) : 0
}

function buildPauseContext(
  raffle: Pick<RaffleLiveRow, "pauseReason" | "minPurchase">,
  isPaused: boolean,
): PauseInfo["pauseContext"] {
  if (!isPaused || !raffle.pauseReason) return null
  const contexts: Record<string, { title: string; description: string }> = {
    manual: { title: "Rifa pausada", description: "Volveremos pronto." },
    auto_full: { title: "Agotado temporalmente", description: "Todos los boletos están reservados o vendidos." },
    auto_insufficient: {
      title: "Pocos boletos disponibles",
      description: `Quedan menos de ${raffle.minPurchase} boletos para la compra mínima.`,
    },
    auto_timeout: { title: "Pausa automática", description: "La rifa se reactivará en breve." },
  }
  return contexts[raffle.pauseReason] ?? null
}

function liveSnapshotFromRow(raffle: RaffleLiveRow): RaffleLiveCoreSnapshot {
  const isPaused = raffle.status === "paused"
  const remainingSeconds = remainingPauseSeconds(raffle.pauseUntil)

  return {
    status: raffle.status,
    isPaused,
    remainingSeconds,
    pauseReason: raffle.pauseReason as PauseReason | null,
    pauseContext: buildPauseContext(raffle, isPaused),
    minPurchase: raffle.minPurchase,
    availability: rafflesRepo.raffleAvailabilityFromCounters(raffle),
  }
}

/** Minimal read for public live polls (narrow SELECT, no joins). */
export async function getRaffleLiveSnapshot(raffleId: number): Promise<RaffleLiveSnapshot | null> {
  const raffle = await rafflesRepo.findRaffleLiveById(raffleId)
  if (!raffle) return null

  const activity = await getRaffleLiveActivity(raffleId)

  return {
    ...liveSnapshotFromRow(raffle),
    ...activity,
  }
}

export async function getPauseInfo(raffleId: number): Promise<PauseInfo | null> {
  const raffle = await rafflesRepo.findRaffleById(raffleId)
  if (!raffle) return null

  const live = liveSnapshotFromRow(raffle)

  return {
    ...live,
    pauseUntil: raffle.pauseUntil,
    autoPauseEnabled: raffle.autoPauseEnabled,
    hasTimer: live.isPaused && live.remainingSeconds > 0,
  }
}

export async function processPausedRaffles(): Promise<{ unpaused: number; finalized: number }> {
  const db = getDb()
  const now = new Date()

  const expired = await db
    .select({ id: raffles.id })
    .from(raffles)
    .where(and(eq(raffles.status, "paused"), lte(raffles.pauseUntil, now)))

  let unpaused = 0
  for (const row of expired) {
    const result = await unpauseRaffle(row.id)
    if (result.success) unpaused++
  }

  return { unpaused, finalized: 0 }
}
