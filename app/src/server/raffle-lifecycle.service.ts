import {
  RaffleInvalidTransitionError,
  RaffleNotActiveError,
  RaffleNotFoundError,
} from "@raffle/shared/errors"
import type { RaffleStatus, TransitionRaffleInput } from "@raffle/shared/validators"
import { withImmediateTransaction } from "@/lib/db.server"
import { getLogger } from "@/lib/logger"
import { pauseRaffle, unpauseRaffle } from "./pause.service"
import { publishRaffle } from "./raffle.service"
import * as rafflesRepo from "./repositories/raffles.repository"

const logger = getLogger()
const MANUAL_PAUSE_MINUTES = 15

const STATUS_LABELS: Record<RaffleStatus, string> = {
  draft: "borrador",
  active: "activa",
  paused: "pausada",
  finished: "finalizada",
  cancelled: "cancelada",
}

/** Direct status changes allowed only via `set_status` (advanced). */
const SET_STATUS_TARGETS: Record<RaffleStatus, readonly RaffleStatus[]> = {
  draft: ["active", "paused", "finished", "cancelled"],
  active: ["draft", "finished", "cancelled"],
  paused: ["draft", "finished", "cancelled"],
  finished: ["draft", "active", "cancelled"],
  cancelled: ["draft", "active"],
}

function manualPauseUntil(): Date {
  const pauseUntil = new Date()
  pauseUntil.setMinutes(pauseUntil.getMinutes() + MANUAL_PAUSE_MINUTES)
  return pauseUntil
}

function assertSetStatusAllowed(from: RaffleStatus, to: RaffleStatus): void {
  if (from === to) return

  if (from === "active" && to === "paused") {
    throw new RaffleInvalidTransitionError(
      "Usa «Pausar ventas» para pausar una rifa activa (incluye temporizador).",
      { from, to, intent: "set_status" },
    )
  }
  if (from === "paused" && to === "active") {
    throw new RaffleInvalidTransitionError(
      "Usa «Reanudar ventas» para reactivar una rifa pausada (evalúa boletos disponibles).",
      { from, to, intent: "set_status" },
    )
  }

  const allowed = SET_STATUS_TARGETS[from]
  if (!allowed.includes(to)) {
    throw new RaffleInvalidTransitionError(
      `No se puede cambiar de ${STATUS_LABELS[from]} a ${STATUS_LABELS[to]}.`,
      { from, to, intent: "set_status" },
    )
  }
}

async function applyStatus(
  raffleId: number,
  status: RaffleStatus,
  options?: { pauseUntil?: Date; pauseReason?: string },
): Promise<{ status: RaffleStatus; previousStatus: RaffleStatus; noChange?: true }> {
  const row = await rafflesRepo.findRaffleById(raffleId)
  if (!row) throw new RaffleNotFoundError(raffleId)

  const previousStatus = row.status as RaffleStatus
  if (previousStatus === status) {
    return {
      status,
      previousStatus,
      noChange: true,
    }
  }

  const pauseMeta =
    status === "paused"
      ? {
          pauseUntil: options?.pauseUntil ?? manualPauseUntil(),
          pauseReason: options?.pauseReason ?? "manual",
        }
      : undefined

  await withImmediateTransaction((tx) =>
    rafflesRepo.setRaffleStatusRow(tx, raffleId, status, pauseMeta),
  )

  logger.info({ raffleId, previousStatus, status }, "raffle:status_changed")
  return { status, previousStatus }
}

export async function transitionRaffle(raffleId: number, input: TransitionRaffleInput) {
  const row = await rafflesRepo.findRaffleById(raffleId)
  if (!row) throw new RaffleNotFoundError(raffleId)

  const from = row.status as RaffleStatus

  switch (input.intent) {
    case "pause_sales": {
      if (from !== "active") {
        throw new RaffleInvalidTransitionError(
          "Solo se pueden pausar ventas cuando la rifa está activa.",
          { raffleId, from, intent: input.intent },
        )
      }
      const result = await pauseRaffle(raffleId, "manual")
      if (!result.success) {
        throw new RaffleInvalidTransitionError(result.error ?? "No se pudo pausar la rifa.", {
          raffleId,
          from,
          intent: input.intent,
        })
      }
      return {
        raffleId,
        intent: input.intent,
        status: "paused" as const,
        message: result.message,
        pauseUntil: result.pauseUntil?.toISOString(),
      }
    }

    case "resume_sales": {
      if (from !== "paused") {
        throw new RaffleInvalidTransitionError(
          "Solo se pueden reanudar ventas cuando la rifa está pausada.",
          { raffleId, from, intent: input.intent },
        )
      }
      const result = await unpauseRaffle(raffleId)
      if (!result.success) {
        throw new RaffleInvalidTransitionError(result.error ?? "No se pudo reanudar la rifa.", {
          raffleId,
          from,
          intent: input.intent,
        })
      }
      return {
        raffleId,
        intent: input.intent,
        status: result.newStatus as RaffleStatus,
        message: result.message,
      }
    }

    case "finish": {
      if (from !== "draft" && from !== "active" && from !== "paused") {
        throw new RaffleInvalidTransitionError(
          "Solo se puede finalizar una rifa en borrador, activa o pausada.",
          { raffleId, from, intent: input.intent },
        )
      }
      const change = await applyStatus(raffleId, "finished")
      return {
        raffleId,
        intent: input.intent,
        ...change,
        message: change.noChange ? "La rifa ya está finalizada" : "Rifa finalizada",
      }
    }

    case "activate": {
      if (from === "paused") {
        const result = await unpauseRaffle(raffleId)
        if (!result.success) {
          throw new RaffleInvalidTransitionError(result.error ?? "No se pudo activar la rifa.", {
            raffleId,
            from,
            intent: input.intent,
          })
        }
        return {
          raffleId,
          intent: input.intent,
          status: result.newStatus as RaffleStatus,
          message: result.message,
        }
      }
      if (from !== "draft" && from !== "finished" && from !== "cancelled") {
        throw new RaffleInvalidTransitionError(
          "Solo se puede activar desde borrador, finalizada o cancelada.",
          { raffleId, from, intent: input.intent },
        )
      }
      const change = await applyStatus(raffleId, "active")
      return {
        raffleId,
        intent: input.intent,
        ...change,
        message: change.noChange ? "La rifa ya está activa" : "Rifa activada",
      }
    }

    case "publish_results": {
      if (from !== "finished") {
        throw new RaffleNotActiveError(raffleId, from)
      }
      const published = await publishRaffle(raffleId, true)
      return { intent: input.intent, ...published }
    }

    case "unpublish_results": {
      if (from !== "finished") {
        throw new RaffleNotActiveError(raffleId, from)
      }
      const unpublished = await publishRaffle(raffleId, false)
      return { intent: input.intent, ...unpublished }
    }

    case "set_status": {
      assertSetStatusAllowed(from, input.status)
      const change = await applyStatus(raffleId, input.status)
      return {
        raffleId,
        intent: input.intent,
        ...change,
        message: change.noChange
          ? `La rifa ya está en estado ${STATUS_LABELS[input.status]}`
          : `Estado actualizado a ${STATUS_LABELS[input.status]}`,
      }
    }

    default: {
      const _exhaustive: never = input
      throw _exhaustive
    }
  }
}
