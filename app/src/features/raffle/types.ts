import type { PaymentMethod } from "@raffle/shared/validators"
import type { RafflePricing } from "@/features/raffle/promotion-types"

/** Método de pago resuelto tal como lo expone la API de rifa. */
export type RafflePaymentMethod = {
  id: number
  label?: string
  method_type: PaymentMethod
  account_info: Record<string, string>
  min_tickets?: number | null
  is_active?: boolean
}

export type RaffleForPurchase = {
  id: number | string
  name: string
  status: string
  price_bs: number | string
  price_usd: number | string
  min_purchase: number | string
  max_purchase: number | string
  tickets_available: number | string
  payment_methods?: RafflePaymentMethod[]
  pricing?: RafflePricing
}

export type PurchaseResult = {
  purchaseId: number
  ticketNumbers: string[]
}
