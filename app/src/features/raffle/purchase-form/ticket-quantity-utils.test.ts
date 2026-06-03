import { describe, expect, it } from "vitest"
import {
  buildSmartQuickPicks,
  clampQuantity,
  getMinimumPurchasableQuantity,
  getPaymentMethodThresholds,
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
    expect(
      getMinimumPurchasableQuantity(1, [
        { min_tickets: 10 },
        { min_tickets: 5 },
      ]),
    ).toBe(5)
  })

  it("never goes below raffle min", () => {
    expect(getMinimumPurchasableQuantity(8, [{ min_tickets: 5 }])).toBe(8)
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
})
