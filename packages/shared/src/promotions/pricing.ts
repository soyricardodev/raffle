import { isDollarMethodType } from "../payment-methods/definitions.js"
import type { PaymentMethod } from "../payment-methods/types.js"
import type { EffectiveUnitPrice, PromotionKind, PromotionRecord } from "./types.js"

export type RaffleBasePrices = {
  priceBsCents: number
  priceUsdCents: number
}

export function baseUnitPriceCents(
  paymentMethod: PaymentMethod,
  prices: RaffleBasePrices,
): number {
  return isDollarMethodType(paymentMethod) ? prices.priceUsdCents : prices.priceBsCents
}

export function isPromotionWithinSchedule(
  promo: Pick<PromotionRecord, "startsAt" | "endsAt">,
  now: Date = new Date(),
): boolean {
  const ts = now.getTime()
  if (promo.startsAt && promo.startsAt.getTime() > ts) return false
  if (promo.endsAt && promo.endsAt.getTime() <= ts) return false
  return true
}

export function promotionScheduleStatus(
  promo: Pick<PromotionRecord, "isActive" | "startsAt" | "endsAt">,
  now: Date = new Date(),
): "active" | "scheduled" | "expired" | "inactive" {
  if (!promo.isActive) return "inactive"
  const ts = now.getTime()
  if (promo.startsAt && promo.startsAt.getTime() > ts) return "scheduled"
  if (promo.endsAt && promo.endsAt.getTime() <= ts) return "expired"
  return "active"
}

function promoAppliesToMethod(
  promo: PromotionRecord,
  rafflePaymentMethodId: number | null,
): boolean {
  if (promo.scope === "all_methods") return true
  if (promo.scope !== "payment_method") return false
  if (rafflePaymentMethodId == null || promo.rafflePaymentMethodId == null) return false
  return promo.rafflePaymentMethodId === rafflePaymentMethodId
}

function finalPriceFromPromotion(
  promo: PromotionRecord,
  baseCents: number,
  paymentMethod: PaymentMethod,
): number | null {
  if (promo.kind === "fixed_price") {
    const fixed = isDollarMethodType(paymentMethod)
      ? promo.promoPriceUsdCents
      : promo.promoPriceBsCents
    if (fixed == null || fixed < 0) return null
    if (fixed >= baseCents) return null
    return fixed
  }

  if (promo.kind === "percentage") {
    const bps = promo.discountPercentBps
    if (bps == null || bps <= 0 || bps >= 10_000) return null
    const discounted = Math.round((baseCents * (10_000 - bps)) / 10_000)
    if (discounted >= baseCents || discounted < 0) return null
    return discounted
  }

  return null
}

function promoPriority(promo: PromotionRecord): number {
  return promo.scope === "payment_method" ? 1 : 0
}

export function resolveEffectiveUnitPrice(params: {
  paymentMethod: PaymentMethod
  prices: RaffleBasePrices
  promotions: PromotionRecord[]
  rafflePaymentMethodId?: number | null
  now?: Date
}): EffectiveUnitPrice {
  const { paymentMethod, prices, promotions, rafflePaymentMethodId = null } = params
  const now = params.now ?? new Date()
  const originalUnitPriceCents = baseUnitPriceCents(paymentMethod, prices)

  const candidates = promotions
    .filter((p) => p.isActive && isPromotionWithinSchedule(p, now))
    .filter((p) => promoAppliesToMethod(p, rafflePaymentMethodId))
    .map((promo) => {
      const final = finalPriceFromPromotion(promo, originalUnitPriceCents, paymentMethod)
      if (final == null) return null
      return { promo, final }
    })
    .filter((c): c is NonNullable<typeof c> => c != null)

  if (candidates.length === 0) {
    return {
      originalUnitPriceCents,
      finalUnitPriceCents: originalUnitPriceCents,
      discountUnitCents: 0,
      promotionId: null,
      promotionName: null,
      promotionEndsAt: null,
    }
  }

  candidates.sort((a, b) => {
    if (a.final !== b.final) return a.final - b.final
    const prio = promoPriority(b.promo) - promoPriority(a.promo)
    if (prio !== 0) return prio
    return a.promo.id - b.promo.id
  })

  const best = candidates[0]!
  const discountUnitCents = originalUnitPriceCents - best.final

  return {
    originalUnitPriceCents,
    finalUnitPriceCents: best.final,
    discountUnitCents,
    promotionId: best.promo.id,
    promotionName: best.promo.name,
    promotionEndsAt: best.promo.endsAt?.toISOString() ?? null,
  }
}

export function bestGlobalPromotion(
  promotions: PromotionRecord[],
  prices: RaffleBasePrices,
  now: Date = new Date(),
): {
  bs: EffectiveUnitPrice
  usd: EffectiveUnitPrice
  highlight: PromotionRecord | null
} {
  const active = promotions.filter(
    (p) => p.isActive && isPromotionWithinSchedule(p, now) && p.scope === "all_methods",
  )

  const bs = resolveEffectiveUnitPrice({
    paymentMethod: "pago_movil",
    prices,
    promotions: active,
  })
  const usd = resolveEffectiveUnitPrice({
    paymentMethod: "zelle",
    prices,
    promotions: active,
  })

  const highlight =
    active.find((p) => p.id === bs.promotionId) ??
    active.find((p) => p.id === usd.promotionId) ??
    null

  return { bs, usd, highlight }
}

export function promotionKindLabel(kind: PromotionKind): string {
  return kind === "fixed_price" ? "Precio fijo" : "Porcentaje"
}
