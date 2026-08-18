import { describe, expect, it } from "vitest"
import {
  buildSmartQuickPicks,
  clampQuantity,
  getMinimumPurchasableQuantity,
  getPaymentMethodThresholds,
  getPurchasableQuantityRange,
} from "@/features/raffle/purchase-form/ticket-quantity-utils"

describe("clampQuantity", () => {
  it("clamps to bounds", () => {
    expect(clampQuantity(0, 5, 100)).toBe(5)
    expect(clampQuantity(999, 5, 100)).toBe(100)
    expect(clampQuantity(Number.NaN, 3, 10)).toBe(3)
  })
})

describe("getMinimumPurchasableQuantity", () => {
  it("uses raffle min when no payment mins", () => {
    expect(getMinimumPurchasableQuantity(1, [{ min_tickets: null }])).toBe(1)
  })

  it("uses lowest payment min that still allows a method", () => {
    expect(getMinimumPurchasableQuantity(1, [{ min_tickets: 10 }, { min_tickets: 5 }])).toBe(5)
  })

  it("keeps the lower eligible payment min when another method has a higher min", () => {
    expect(getMinimumPurchasableQuantity(1, [{ min_tickets: 10 }, { min_tickets: 60 }])).toBe(10)
  })

  it("allows methods without their own min to keep the raffle min", () => {
    expect(getMinimumPurchasableQuantity(1, [{ min_tickets: null }, { min_tickets: 60 }])).toBe(1)
  })

  it("never goes below raffle min", () => {
    expect(getMinimumPurchasableQuantity(8, [{ min_tickets: 5 }])).toBe(8)
  })
})

describe("getPurchasableQuantityRange", () => {
  it("keeps the form purchasable when one method min is within stock and another is above stock", () => {
    expect(
      getPurchasableQuantityRange(1, 100, 50, [{ min_tickets: 10 }, { min_tickets: 60 }]),
    ).toEqual({
      min: 10,
      max: 50,
      hasPurchasableQuantity: true,
      selloutFlex: false,
    })
  })

  it("keeps methods without their own min purchasable when restrictive methods are above stock", () => {
    expect(
      getPurchasableQuantityRange(1, 100, 50, [{ min_tickets: null }, { min_tickets: 60 }]),
    ).toEqual({
      min: 1,
      max: 50,
      hasPurchasableQuantity: true,
      selloutFlex: false,
    })
  })

  it("allows partial purchases when stock is below every method minimum", () => {
    expect(getPurchasableQuantityRange(1, 100, 50, [{ min_tickets: 60 }])).toEqual({
      min: 1,
      max: 50,
      hasPurchasableQuantity: true,
      selloutFlex: true,
    })
  })

  it("allows partial purchases when stock is below the raffle minimum", () => {
    expect(getPurchasableQuantityRange(15, 100, 10, [{ min_tickets: 15 }])).toEqual({
      min: 1,
      max: 10,
      hasPurchasableQuantity: true,
      selloutFlex: true,
    })
  })
})

describe("getPaymentMethodThresholds", () => {
  it("returns unique sorted thresholds", () => {
    expect(
      getPaymentMethodThresholds([
        { min_tickets: 10 },
        { min_tickets: 5 },
        { min_tickets: 10 },
        { min_tickets: null },
      ]),
    ).toEqual([5, 10])
  })
})

describe("buildSmartQuickPicks", () => {
  it("always includes min and max within chip limit", () => {
    const picks = buildSmartQuickPicks(1, 774, { maxChips: 6 })
    expect(picks.length).toBeLessThanOrEqual(6)
    expect(picks[0]?.value).toBe(1)
    expect(picks.at(-1)?.value).toBe(774)
    expect(picks.at(-1)?.label).toBe("Máx")
  })

  it("includes payment thresholds when space allows", () => {
    const picks = buildSmartQuickPicks(1, 100, {
      paymentThresholds: [25],
      maxChips: 6,
    })
    expect(picks.some((p) => p.value === 25)).toBe(true)
  })

  it("returns single chip when min equals max", () => {
    expect(buildSmartQuickPicks(5, 5)).toEqual([{ value: 5, label: "5" }])
  })

  it("returns every value when the range fits in the chip limit", () => {
    expect(buildSmartQuickPicks(1, 10, { maxChips: 10 }).map((pick) => pick.value)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
  })
})
