import {
  RaffleFinishedError,
  RaffleNotActiveError,
  RafflePausedError,
} from "@raffle/shared/errors"
import type { PauseInfo } from "@/server/pause.service"

export type RaffleSaleRow = {
  status: string
  drawDate: Date | null
}

/** Public checkout: rifa activa, no pausada, sorteo futuro. */
export function assertRaffleOpenForPublicPurchase(
  raffle: RaffleSaleRow,
  raffleId: number,
  pauseInfo?: PauseInfo | null,
): void {
  assertRaffleNotEnded(raffle, raffleId)

  if (raffle.status === "paused") {
    throw new RafflePausedError(raffleId, pauseInfo ?? undefined)
  }

  if (raffle.status !== "active") {
    throw new RaffleNotActiveError(raffleId, raffle.status)
  }
}

/** Admin add/remove/reassign: no rifa terminada; activa o pausada. */
export function assertRaffleOpenForAdminTicketChanges(raffle: RaffleSaleRow, raffleId: number): void {
  assertRaffleNotEnded(raffle, raffleId)

  if (raffle.status !== "active" && raffle.status !== "paused") {
    throw new RaffleNotActiveError(raffleId, raffle.status)
  }
}

function assertRaffleNotEnded(raffle: RaffleSaleRow, raffleId: number): void {
  if (raffle.status === "finished" || raffle.status === "cancelled") {
    throw new RaffleFinishedError(raffleId)
  }
  if (raffle.drawDate && raffle.drawDate <= new Date()) {
    throw new RaffleFinishedError(raffleId)
  }
}
