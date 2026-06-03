import { useMemo } from "react"
import { useRaffleLiveDataOrFetch } from "@/features/raffle/raffle-live-context"
import {
  calculateRaffleSalesProgress,
  type RaffleProgressInput,
  type RaffleSalesProgress,
} from "@/lib/raffle-progress"

type UseRaffleSalesProgressOptions = {
  raffleId: string | number
  raffle: RaffleProgressInput
  liveEnabled?: boolean
}

export function useRaffleSalesProgress({
  raffleId,
  raffle,
  liveEnabled = true,
}: UseRaffleSalesProgressOptions): RaffleSalesProgress {
  const live = useRaffleLiveDataOrFetch(raffleId, { enabled: liveEnabled })
  const availability = live.data?.availability

  const sold = Number(raffle.tickets_sold) || 0
  const reserved = Number(raffle.tickets_reserved) || 0
  const total = Number(raffle.total_tickets) || 1

  return useMemo(() => {
    if (availability) {
      return calculateRaffleSalesProgress({
        tickets_sold: availability.sold,
        tickets_reserved: availability.reserved,
        total_tickets: availability.total,
      })
    }
    return calculateRaffleSalesProgress({
      tickets_sold: sold,
      tickets_reserved: reserved,
      total_tickets: total,
    })
  }, [availability, sold, reserved, total])
}
