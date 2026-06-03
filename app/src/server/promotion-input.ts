import { fromCents } from "@raffle/shared/db"
import type { PromotionRecord } from "@raffle/shared/promotions/types"
import {
  discountBpsToPercent,
  type CreateRafflePromotionInput,
  type UpdateRafflePromotionInput,
} from "@raffle/shared/validators"

export function mergePromotionInput(
  existing: PromotionRecord,
  patch: UpdateRafflePromotionInput,
): CreateRafflePromotionInput {
  return {
    name: patch.name ?? existing.name,
    description: patch.description !== undefined ? patch.description : existing.description,
    is_active: patch.is_active ?? existing.isActive,
    kind: patch.kind ?? existing.kind,
    scope: patch.scope ?? existing.scope,
    raffle_payment_method_id:
      patch.raffle_payment_method_id !== undefined
        ? patch.raffle_payment_method_id
        : existing.rafflePaymentMethodId,
    promo_price_bs:
      patch.promo_price_bs !== undefined
        ? patch.promo_price_bs
        : existing.promoPriceBsCents != null
          ? fromCents(existing.promoPriceBsCents)
          : null,
    promo_price_usd:
      patch.promo_price_usd !== undefined
        ? patch.promo_price_usd
        : existing.promoPriceUsdCents != null
          ? fromCents(existing.promoPriceUsdCents)
          : null,
    discount_percent:
      patch.discount_percent !== undefined
        ? patch.discount_percent
        : existing.discountPercentBps != null
          ? discountBpsToPercent(existing.discountPercentBps)
          : null,
    starts_at:
      patch.starts_at !== undefined
        ? patch.starts_at
        : existing.startsAt?.toISOString() ?? null,
    ends_at:
      patch.ends_at !== undefined ? patch.ends_at : existing.endsAt?.toISOString() ?? null,
  }
}
