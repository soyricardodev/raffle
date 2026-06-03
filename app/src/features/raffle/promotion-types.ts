import type { PromotionKind, PromotionScope } from "@raffle/shared/promotions/types"

export type MethodPromotionSummary = {
  raffle_payment_method_id: number
  name: string
  kind: string
  discount_percent: number | null
  promo_price_bs: number | null
  promo_price_usd: number | null
  ends_at: string | null
}

export type MethodPromotionQuote = {
  raffle_payment_method_id: number
  final_unit_price: number
  original_unit_price: number
  discount_per_ticket: number
  currency: "Bs" | "USD"
  badge: string | null
  hint: string | null
}

export type RafflePricing = {
  price_bs: number
  price_usd: number
  effective_price_bs: number
  effective_price_usd: number
  has_active_promotion: boolean
  has_global_promotion: boolean
  has_method_promotions: boolean
  promotion: {
    id: number
    name: string
    description: string | null
    kind: string
    scope: string
    ends_at: string | null
    discount_percent: number | null
  } | null
  method_promotions: MethodPromotionSummary[]
  method_quotes: MethodPromotionQuote[]
}

export type RafflePromotionApi = {
  id: number
  raffle_id: number
  name: string
  description: string | null
  is_active: boolean
  kind: PromotionKind
  scope: PromotionScope
  raffle_payment_method_id: number | null
  promo_price_bs: number | null
  promo_price_usd: number | null
  discount_percent: number | null
  starts_at: string | null
  ends_at: string | null
}
