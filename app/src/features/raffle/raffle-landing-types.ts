import type { RafflePricing } from "@/features/raffle/promotion-types"
import type { RafflePaymentMethod } from "@/features/raffle/types"
import type { RaffleProgressInput } from "@/lib/raffle-progress"

export type RaffleLandingRaffle = RaffleProgressInput & {
  id: number | string
  name: string
  description?: string | null
  image_url?: string | null
  status?: string
  tickets_available: number | string
  price_bs: number | string
  price_usd: number | string
  pricing?: RafflePricing
  payment_methods?: RafflePaymentMethod[]
  days_remaining?: number | null
  draw_date?: string | null
}

export function raffleTicketsInput(raffle: RaffleProgressInput) {
  return {
    tickets_sold: raffle.tickets_sold,
    tickets_reserved: raffle.tickets_reserved,
    total_tickets: raffle.total_tickets,
  }
}
