export const PROMOTION_KINDS = ["fixed_price", "percentage"] as const
export type PromotionKind = (typeof PROMOTION_KINDS)[number]

export const PROMOTION_SCOPES = ["all_methods", "payment_method"] as const
export type PromotionScope = (typeof PROMOTION_SCOPES)[number]

export type PromotionRecord = {
  id: number
  raffleId: number
  name: string
  description: string | null
  isActive: boolean
  kind: PromotionKind
  scope: PromotionScope
  rafflePaymentMethodId: number | null
  promoPriceBsCents: number | null
  promoPriceUsdCents: number | null
  discountPercentBps: number | null
  startsAt: Date | null
  endsAt: Date | null
}

export type EffectiveUnitPrice = {
  originalUnitPriceCents: number
  finalUnitPriceCents: number
  discountUnitCents: number
  promotionId: number | null
  promotionName: string | null
  promotionEndsAt: string | null
}
