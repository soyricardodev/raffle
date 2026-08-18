import {
  calculateRaffleSalesProgress,
  type RaffleProgressInput,
} from "@/lib/raffle-progress"

/** Dev-only override. Production: only while the latest raffle is finished. */
export const FORCE_NEXT_RAFFLE_COMING_BANNER = false

export type NextRaffleComingRaffle = RaffleProgressInput & {
  status?: string | null
}

export type NextRaffleComingInput = {
  force?: boolean
  hasActiveRaffle: boolean
  latestFinished: NextRaffleComingRaffle | null
}

export function isRaffleSoldOut(raffle: RaffleProgressInput): boolean {
  return calculateRaffleSalesProgress(raffle).percentage >= 100
}

export function shouldShowNextRaffleComingBanner(input: NextRaffleComingInput): boolean {
  if (input.force) return true
  if (input.hasActiveRaffle) return false
  return input.latestFinished?.status === "finished"
}
