import { describe, expect, it } from "vitest"
import {
  bestGlobalPromotion,
  isPromotionWithinSchedule,
  resolveEffectiveUnitPrice,
} from "./pricing.js"
import type { PromotionRecord } from "./types.js"

const basePrices = { priceBsCents: 20_000, priceUsdCents: 700 }

function promo(overrides: Partial<PromotionRecord> & Pick<PromotionRecord, "id" | "kind">): PromotionRecord {
  return {
    id: overrides.id,
    raffleId: 1,
    name: overrides.name ?? "Test",
    description: null,
    isActive: overrides.isActive ?? true,
    kind: overrides.kind,
    scope: overrides.scope ?? "all_methods",
    rafflePaymentMethodId: overrides.rafflePaymentMethodId ?? null,
    promoPriceBsCents: overrides.promoPriceBsCents ?? null,
    promoPriceUsdCents: overrides.promoPriceUsdCents ?? null,
    discountPercentBps: overrides.discountPercentBps ?? null,
    startsAt: overrides.startsAt ?? null,
    endsAt: overrides.endsAt ?? null,
  }
}

describe("resolveEffectiveUnitPrice", () => {
  it("returns base price when no promotions", () => {
    const result = resolveEffectiveUnitPrice({
      paymentMethod: "pago_movil",
      prices: basePrices,
      promotions: [],
    })
    expect(result.finalUnitPriceCents).toBe(20_000)
    expect(result.discountUnitCents).toBe(0)
    expect(result.promotionId).toBeNull()
  })

  it("applies fixed Bs price", () => {
    const result = resolveEffectiveUnitPrice({
      paymentMethod: "pago_movil",
      prices: basePrices,
      promotions: [
        promo({
          id: 1,
          kind: "fixed_price",
          promoPriceBsCents: 10_000,
        }),
      ],
    })
    expect(result.finalUnitPriceCents).toBe(10_000)
    expect(result.discountUnitCents).toBe(10_000)
    expect(result.promotionId).toBe(1)
  })

  it("applies percentage discount", () => {
    const result = resolveEffectiveUnitPrice({
      paymentMethod: "zelle",
      prices: basePrices,
      promotions: [
        promo({
          id: 2,
          kind: "percentage",
          discountPercentBps: 2000,
        }),
      ],
    })
    expect(result.finalUnitPriceCents).toBe(560)
    expect(result.promotionId).toBe(2)
  })

  it("prefers payment-method promo on tie", () => {
    const result = resolveEffectiveUnitPrice({
      paymentMethod: "pago_movil",
      prices: basePrices,
      promotions: [
        promo({
          id: 1,
          kind: "fixed_price",
          scope: "all_methods",
          promoPriceBsCents: 15_000,
        }),
        promo({
          id: 2,
          kind: "fixed_price",
          scope: "payment_method",
          rafflePaymentMethodId: 5,
          promoPriceBsCents: 15_000,
        }),
      ],
      rafflePaymentMethodId: 5,
    })
    expect(result.promotionId).toBe(2)
  })

  it("picks lowest price when multiple apply", () => {
    const result = resolveEffectiveUnitPrice({
      paymentMethod: "pago_movil",
      prices: basePrices,
      promotions: [
        promo({ id: 1, kind: "fixed_price", promoPriceBsCents: 18_000 }),
        promo({ id: 2, kind: "percentage", discountPercentBps: 5000 }),
      ],
    })
    expect(result.finalUnitPriceCents).toBe(10_000)
    expect(result.promotionId).toBe(2)
  })

  it("ignores expired promotions", () => {
    const past = new Date(Date.now() - 60_000)
    const result = resolveEffectiveUnitPrice({
      paymentMethod: "pago_movil",
      prices: basePrices,
      promotions: [
        promo({
          id: 1,
          kind: "fixed_price",
          promoPriceBsCents: 5_000,
          endsAt: past,
        }),
      ],
      now: new Date(),
    })
    expect(result.finalUnitPriceCents).toBe(20_000)
  })

  it("ignores scheduled future promotions", () => {
    const future = new Date(Date.now() + 86_400_000)
    const result = resolveEffectiveUnitPrice({
      paymentMethod: "pago_movil",
      prices: basePrices,
      promotions: [
        promo({
          id: 1,
          kind: "fixed_price",
          promoPriceBsCents: 5_000,
          startsAt: future,
        }),
      ],
      now: new Date(),
    })
    expect(result.finalUnitPriceCents).toBe(20_000)
  })
})

describe("isPromotionWithinSchedule", () => {
  it("allows permanent promos", () => {
    expect(
      isPromotionWithinSchedule({ startsAt: null, endsAt: null }, new Date()),
    ).toBe(true)
  })
})

describe("bestGlobalPromotion", () => {
  it("returns highlight when global promo active", () => {
    const { highlight, bs } = bestGlobalPromotion(
      [
        promo({
          id: 1,
          kind: "percentage",
          discountPercentBps: 1000,
          scope: "all_methods",
        }),
      ],
      basePrices,
    )
    expect(highlight?.id).toBe(1)
    expect(bs.discountUnitCents).toBeGreaterThan(0)
  })
})
