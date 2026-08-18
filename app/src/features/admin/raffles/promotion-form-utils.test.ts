import { describe, expect, it } from "vitest"
import {
  applyDiscountChip,
  applyDurationPreset,
  buildPromoPayload,
  defaultPromoForm,
  discountChipFromForm,
  discountedPrice,
  durationRange,
  fieldErrorsFromPromoPayload,
  formatPriceShiftLine,
  formatPromoAmount,
  formatPromoListDetail,
  formatPromoScopeLabel,
  formFromPromotion,
  previewFromApiPromo,
  previewPromoPrices,
  suggestedPromotionName,
  summarizeActivePromotion,
  withSuggestedName,
} from "@/features/admin/raffles/promotion-form-utils"
import type { RafflePricing, RafflePromotionApi } from "@/features/raffle/promotion-types"
import { datetimeLocalToIso } from "@/lib/date-input"

const samplePromo = (overrides: Partial<RafflePromotionApi> = {}): RafflePromotionApi => ({
  id: 1,
  raffle_id: 9,
  name: "20% de descuento",
  description: null,
  is_active: true,
  kind: "percentage",
  scope: "all_methods",
  raffle_payment_method_id: null,
  promo_price_bs: null,
  promo_price_usd: null,
  discount_percent: 20,
  starts_at: null,
  ends_at: null,
  ...overrides,
})

describe("suggestedPromotionName", () => {
  it("names a global percentage", () => {
    expect(
      suggestedPromotionName({
        kind: "percentage",
        discountPercent: "20",
        promoPriceBs: "",
        promoPriceUsd: "",
        scope: "all_methods",
      }),
    ).toBe("20% de descuento")
  })

  it("includes the payment method for scoped percentages", () => {
    expect(
      suggestedPromotionName({
        kind: "percentage",
        discountPercent: "15",
        promoPriceBs: "",
        promoPriceUsd: "",
        scope: "payment_method",
        methodLabel: "Zelle",
      }),
    ).toBe("15% de descuento en Zelle")
  })

  it("prefers Bs for fixed prices and falls back to USD", () => {
    expect(
      suggestedPromotionName({
        kind: "fixed_price",
        discountPercent: "",
        promoPriceBs: "40",
        promoPriceUsd: "4",
        scope: "all_methods",
      }),
    ).toBe("Precio promo Bs 40")
    expect(
      suggestedPromotionName({
        kind: "fixed_price",
        discountPercent: "",
        promoPriceBs: "",
        promoPriceUsd: "4.5",
        scope: "all_methods",
      }),
    ).toBe("Precio promo $4.50")
  })
})

describe("withSuggestedName", () => {
  it("refreshes the name until the admin edits it", () => {
    const form = { ...defaultPromoForm(), kind: "percentage" as const, discount_percent: "10" }
    const next = withSuggestedName(form, null, false)
    expect(next.name).toBe("10% de descuento")
    const kept = withSuggestedName(
      { ...form, name: "Promo loca", discount_percent: "10" },
      null,
      true,
    )
    expect(kept.name).toBe("Promo loca")
  })
})

describe("durationRange", () => {
  it("sets a 24h window from the current minute", () => {
    const now = new Date(2026, 7, 18, 15, 30, 45, 123)
    expect(durationRange("24h", now)).toEqual({
      starts_at: "2026-08-18T15:30",
      ends_at: "2026-08-19T15:30",
    })
  })

  it("uses this Friday–Sunday when today is already the weekend", () => {
    expect(durationRange("weekend", new Date(2026, 7, 22, 10, 0, 0))).toEqual({
      starts_at: "2026-08-21T00:00",
      ends_at: "2026-08-23T23:59",
    })
    expect(durationRange("weekend", new Date(2026, 7, 23, 18, 0, 0))).toEqual({
      starts_at: "2026-08-21T00:00",
      ends_at: "2026-08-23T23:59",
    })
  })

  it("uses the next Friday–Sunday on weekdays", () => {
    expect(durationRange("weekend", new Date(2026, 7, 17, 9, 0, 0))).toEqual({
      starts_at: "2026-08-21T00:00",
      ends_at: "2026-08-23T23:59",
    })
  })
})

describe("applyDurationPreset", () => {
  it("clears dates for a permanent promo and keeps them when choosing custom", () => {
    expect(applyDurationPreset("permanent")).toEqual({
      duration_mode: "permanent",
      starts_at: "",
      ends_at: "",
    })
    expect(
      applyDurationPreset("custom", new Date(), { starts_at: "2026-08-21T00:00", ends_at: "" }),
    ).toEqual({
      duration_mode: "custom",
      starts_at: "2026-08-21T00:00",
      ends_at: "",
    })
  })
})

describe("discount chips", () => {
  it("maps form values to chips and applies a chip", () => {
    const form = defaultPromoForm()
    expect(discountChipFromForm(form)).toBe("fixed")
    expect(applyDiscountChip("10", form).discount_percent).toBe("10")
    expect(discountChipFromForm(applyDiscountChip("10", form))).toBe("10")
    expect(applyDiscountChip("custom_percent", form).discount_percent).toBe("")
    expect(applyDiscountChip("fixed", form).kind).toBe("fixed_price")
  })
})

describe("previewPromoPrices", () => {
  it("discounts both currencies with the same cents math as pricing", () => {
    expect(discountedPrice(50, 20)).toBe(40)
    const percentForm = {
      ...defaultPromoForm(),
      kind: "percentage" as const,
      discount_percent: "20",
    }
    expect(previewPromoPrices(percentForm, 50, 5)).toEqual({
      bs: { from: 50, to: 40 },
      usd: { from: 5, to: 4 },
    })
    expect(formatPriceShiftLine(previewPromoPrices(percentForm, 50, 5))).toBe("Bs 50 → 40 · $5 → 4")
  })

  it("uses fixed prices when provided", () => {
    const preview = previewPromoPrices(
      {
        kind: "fixed_price",
        discount_percent: "",
        promo_price_bs: "40",
        promo_price_usd: "",
      },
      50,
      5,
    )
    expect(preview).toEqual({
      bs: { from: 50, to: 40 },
      usd: null,
    })
  })
})

describe("buildPromoPayload", () => {
  it("defaults to an active fixed-price promo without dates", () => {
    expect(buildPromoPayload(defaultPromoForm())).toMatchObject({
      name: "Precio promo",
      kind: "fixed_price",
      scope: "all_methods",
      discount_percent: null,
      promo_price_bs: null,
      promo_price_usd: null,
      raffle_payment_method_id: null,
      starts_at: null,
      ends_at: null,
      is_active: true,
    })
  })

  it("converts custom local dates to ISO and drops the other kind's fields", () => {
    const payload = buildPromoPayload({
      ...defaultPromoForm(),
      kind: "fixed_price",
      discount_percent: "20",
      promo_price_bs: "40",
      duration_mode: "custom",
      starts_at: "2026-08-21T00:00",
      ends_at: "2026-08-23T23:59",
    })
    expect(payload.discount_percent).toBeNull()
    expect(payload.promo_price_bs).toBe(40)
    expect(payload.starts_at).toBe(datetimeLocalToIso("2026-08-21T00:00"))
    expect(payload.ends_at).toBe(datetimeLocalToIso("2026-08-23T23:59"))
  })

  it("surfaces zod field errors for an empty name", () => {
    const errors = fieldErrorsFromPromoPayload(
      buildPromoPayload({ ...defaultPromoForm(), name: "   " }),
    )
    expect(errors.name).toBeTruthy()
  })
})

describe("formFromPromotion", () => {
  it("treats scheduled promos as a custom range", () => {
    const form = formFromPromotion(
      samplePromo({
        starts_at: new Date(2026, 7, 21, 0, 0).toISOString(),
        ends_at: new Date(2026, 7, 23, 23, 59).toISOString(),
      }),
    )
    expect(form.duration_mode).toBe("custom")
    expect(form.starts_at).toBeTruthy()
    expect(formFromPromotion(samplePromo()).duration_mode).toBe("permanent")
  })
})

describe("list helpers", () => {
  it("shows the method name instead of a generic scope", () => {
    const methods = [{ id: 3, label: "Zelle" }]
    expect(
      formatPromoScopeLabel({ scope: "payment_method", raffle_payment_method_id: 3 }, methods),
    ).toBe("Zelle")
    expect(formatPromoListDetail(samplePromo({ discount_percent: 15 }), methods)).toContain("15%")
    expect(formatPromoAmount(40.5)).toBe("40.50")
    expect(previewFromApiPromo(samplePromo(), 50, 5).bs).toEqual({ from: 50, to: 40 })
  })
})

describe("summarizeActivePromotion", () => {
  const emptyPricing: RafflePricing = {
    price_bs: 50,
    price_usd: 5,
    effective_price_bs: 50,
    effective_price_usd: 5,
    has_active_promotion: false,
    has_global_promotion: false,
    has_method_promotions: false,
    promotion: null,
    method_promotions: [],
    method_quotes: [],
  }

  it("describes a global percent off the base prices", () => {
    const summary = summarizeActivePromotion(
      {
        ...emptyPricing,
        effective_price_bs: 40,
        effective_price_usd: 4,
        has_active_promotion: true,
        has_global_promotion: true,
        promotion: {
          id: 1,
          name: "Fin de semana",
          description: null,
          kind: "percentage",
          scope: "all_methods",
          ends_at: null,
          discount_percent: 20,
        },
      },
      50,
      5,
    )
    expect(summary).toEqual({
      hasActive: true,
      title: "20% de descuento",
      priceHint: "Bs 50 → 40 · $5 → 4",
    })
  })

  it("falls back to a method promo label", () => {
    const summary = summarizeActivePromotion(
      {
        ...emptyPricing,
        has_active_promotion: true,
        has_method_promotions: true,
        method_promotions: [
          {
            raffle_payment_method_id: 3,
            name: "Zelle barato",
            kind: "percentage",
            discount_percent: 10,
            promo_price_bs: null,
            promo_price_usd: null,
            ends_at: null,
          },
        ],
      },
      50,
      5,
    )
    expect(summary.hasActive).toBe(true)
    expect(summary.title).toBe("Zelle barato")
  })
})
