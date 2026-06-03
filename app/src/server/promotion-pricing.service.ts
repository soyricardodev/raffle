import { fromCents } from "@raffle/shared/db"
import { isDollarMethodType } from "@raffle/shared/payment-methods"
import {
  formatMethodPromotionBadge,
  formatMethodPromotionHint,
} from "@raffle/shared/promotions/display"
import {
  bestGlobalPromotion,
  isPromotionWithinSchedule,
  resolveEffectiveUnitPrice,
  type RaffleBasePrices,
} from "@raffle/shared/promotions"
import type { PaymentMethod } from "@raffle/shared/validators"
import { ValidationError } from "@raffle/shared/errors"
import type { CreateRafflePromotionInput } from "@raffle/shared/validators"
import * as promotionsRepo from "./repositories/raffle-promotions.repository"

export type PaymentMethodForPricing = {
  id: number
  method_type: PaymentMethod
  label?: string | null
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

export type PublicRafflePricing = {
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
  method_promotions: Array<{
    raffle_payment_method_id: number
    name: string
    kind: string
    discount_percent: number | null
    promo_price_bs: number | null
    promo_price_usd: number | null
    ends_at: string | null
  }>
  method_quotes: MethodPromotionQuote[]
}

export async function getPromotionsForRaffle(raffleId: number) {
  return promotionsRepo.listPromotionsByRaffle(raffleId)
}

export function buildPublicRafflePricing(
  prices: RaffleBasePrices,
  promotions: Awaited<ReturnType<typeof getPromotionsForRaffle>>,
  paymentMethods: PaymentMethodForPricing[],
): PublicRafflePricing {
  const baseBs = fromCents(prices.priceBsCents)
  const baseUsd = fromCents(prices.priceUsdCents)
  const { bs, usd, highlight } = bestGlobalPromotion(promotions, prices)

  const hasGlobalPromotion = bs.discountUnitCents > 0 || usd.discountUnitCents > 0

  const methodPromotions = promotions
    .filter(
      (p) =>
        p.isActive &&
        p.scope === "payment_method" &&
        p.rafflePaymentMethodId != null &&
        isPromotionWithinSchedule(p),
    )
    .map((p) => ({
      raffle_payment_method_id: p.rafflePaymentMethodId!,
      name: p.name,
      kind: p.kind,
      discount_percent:
        p.discountPercentBps != null ? p.discountPercentBps / 100 : null,
      promo_price_bs: p.promoPriceBsCents != null ? fromCents(p.promoPriceBsCents) : null,
      promo_price_usd: p.promoPriceUsdCents != null ? fromCents(p.promoPriceUsdCents) : null,
      ends_at: p.endsAt?.toISOString() ?? null,
    }))

  const hasMethodPromotions = methodPromotions.length > 0
  const methodPromoById = new Map(
    methodPromotions.map((p) => [p.raffle_payment_method_id, p]),
  )

  const method_quotes: MethodPromotionQuote[] = paymentMethods.map((method) => {
    const unit = resolveEffectiveUnitPrice({
      paymentMethod: method.method_type,
      prices,
      promotions,
      rafflePaymentMethodId: method.id,
    })
    const summary = methodPromoById.get(method.id)
    const hasDiscount = unit.discountUnitCents > 0
    const currency = isDollarMethodType(method.method_type) ? "USD" : "Bs"
    return {
      raffle_payment_method_id: method.id,
      final_unit_price: fromCents(unit.finalUnitPriceCents),
      original_unit_price: fromCents(unit.originalUnitPriceCents),
      discount_per_ticket: fromCents(unit.discountUnitCents),
      currency,
      badge: summary && hasDiscount ? formatMethodPromotionBadge(summary) : null,
      hint:
        summary && hasDiscount
          ? formatMethodPromotionHint(summary, {
              method_type: method.method_type,
              label: method.label ?? undefined,
            })
          : null,
    }
  })

  return {
    price_bs: baseBs,
    price_usd: baseUsd,
    effective_price_bs: fromCents(bs.finalUnitPriceCents),
    effective_price_usd: fromCents(usd.finalUnitPriceCents),
    has_active_promotion: hasGlobalPromotion || hasMethodPromotions,
    has_global_promotion: hasGlobalPromotion,
    has_method_promotions: hasMethodPromotions,
    promotion: highlight
      ? {
          id: highlight.id,
          name: highlight.name,
          description: highlight.description,
          kind: highlight.kind,
          scope: highlight.scope,
          ends_at: highlight.endsAt?.toISOString() ?? null,
          discount_percent:
            highlight.discountPercentBps != null
              ? highlight.discountPercentBps / 100
              : null,
        }
      : null,
    method_promotions: methodPromotions,
    method_quotes,
  }
}

export function assertPromotionAgainstBasePrices(
  input: CreateRafflePromotionInput,
  prices: RaffleBasePrices,
): void {
  if (input.kind === "fixed_price") {
    if (
      input.promo_price_bs != null &&
      Math.round(input.promo_price_bs * 100) >= prices.priceBsCents
    ) {
      throw new ValidationError(
        "El precio promocional en Bs debe ser menor al precio base de la rifa",
      )
    }
    if (
      input.promo_price_usd != null &&
      Math.round(input.promo_price_usd * 100) >= prices.priceUsdCents
    ) {
      throw new ValidationError(
        "El precio promocional en USD debe ser menor al precio base de la rifa",
      )
    }
  }
}
