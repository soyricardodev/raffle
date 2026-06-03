import { paymentMethodDisplayLabel } from "@raffle/shared/payment-methods"
import {
  formatMethodPromotionBadge as formatMethodPromotionBadgeShared,
  formatMethodPromotionHint as formatMethodPromotionHintShared,
} from "@raffle/shared/promotions/display"
import type { PromotionRecord } from "@raffle/shared/promotions/types"
import type { MethodPromotionSummary, RafflePromotionApi } from "@/features/raffle/promotion-types"
import type { RafflePaymentMethod } from "@/features/raffle/types"

export function mapApiPromotionToRecord(p: RafflePromotionApi): PromotionRecord {
  return {
    id: p.id,
    raffleId: p.raffle_id,
    name: p.name,
    description: p.description,
    isActive: p.is_active,
    kind: p.kind,
    scope: p.scope,
    rafflePaymentMethodId: p.raffle_payment_method_id,
    promoPriceBsCents: p.promo_price_bs != null ? Math.round(p.promo_price_bs * 100) : null,
    promoPriceUsdCents: p.promo_price_usd != null ? Math.round(p.promo_price_usd * 100) : null,
    discountPercentBps: p.discount_percent != null ? Math.round(p.discount_percent * 100) : null,
    startsAt: p.starts_at ? new Date(p.starts_at) : null,
    endsAt: p.ends_at ? new Date(p.ends_at) : null,
  }
}

export function methodHasPromotion(
  methodId: number,
  methodPromotions: Array<{ raffle_payment_method_id: number }>,
): boolean {
  return methodPromotions.some((m) => m.raffle_payment_method_id === methodId)
}

export function paymentMethodLabel(method: Pick<RafflePaymentMethod, "method_type" | "label">) {
  return paymentMethodDisplayLabel(method)
}

export function formatMethodPromotionBadge(promo: MethodPromotionSummary): string {
  return formatMethodPromotionBadgeShared(promo)
}

export function formatMethodPromotionHint(
  promo: MethodPromotionSummary,
  method: Pick<RafflePaymentMethod, "method_type" | "label">,
): string {
  return formatMethodPromotionHintShared(promo, method)
}

export function buildMethodPromotionBadgeMap(
  quotes: Array<{ raffle_payment_method_id: number; badge: string | null }>,
): Record<number, string> {
  const map: Record<number, string> = {}
  for (const quote of quotes) {
    if (quote.badge) {
      map[quote.raffle_payment_method_id] = quote.badge
    }
  }
  return map
}
