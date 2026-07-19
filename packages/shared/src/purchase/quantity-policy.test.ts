import { describe, expect, it } from "vitest"
import {
  getStandardMinimumQuantity,
  isPaymentMethodMinWaived,
  isRaffleMinWaived,
  isSelloutFlexMode,
  resolvePurchasableQuantityRange,
} from "./quantity-policy.js"

describe("getStandardMinimumQuantity", () => {
  it("uses raffle min when no payment mins", () => {
    expect(getStandardMinimumQuantity(1, [{ min_tickets: null }])).toBe(1)
  })

  it("uses lowest payment min that still allows a method", () => {
    expect(getStandardMinimumQuantity(1, [{ min_tickets: 10 }, { min_tickets: 5 }])).toBe(5)
  })

  it("never goes below raffle min", () => {
    expect(getStandardMinimumQuantity(8, [{ min_tickets: 5 }])).toBe(8)
  })
})

describe("sellout flex", () => {
  it("detects when stock is below the standard minimum", () => {
    expect(isSelloutFlexMode(10, 15)).toBe(true)
    expect(isSelloutFlexMode(15, 15)).toBe(false)
    expect(isSelloutFlexMode(0, 15)).toBe(false)
  })

  it("waives raffle min when stock is below it", () => {
    expect(isRaffleMinWaived(10, 15)).toBe(true)
    expect(isRaffleMinWaived(20, 15)).toBe(false)
  })

  it("waives payment method min when stock is below it", () => {
    expect(isPaymentMethodMinWaived(50, 60)).toBe(true)
    expect(isPaymentMethodMinWaived(60, 60)).toBe(false)
    expect(isPaymentMethodMinWaived(50, null)).toBe(false)
  })
})

describe("resolvePurchasableQuantityRange", () => {
  it("allows partial purchases when stock is below the standard minimum", () => {
    expect(
      resolvePurchasableQuantityRange({
        raffleMin: 15,
        raffleMax: 100,
        available: 10,
        methods: [{ min_tickets: 15 }],
      }),
    ).toEqual({
      min: 1,
      max: 10,
      hasPurchasableQuantity: true,
      selloutFlex: true,
    })
  })

  it("allows buying remaining stock when every method requires more than available", () => {
    expect(
      resolvePurchasableQuantityRange({
        raffleMin: 1,
        raffleMax: 100,
        available: 50,
        methods: [{ min_tickets: 60 }],
      }),
    ).toEqual({
      min: 1,
      max: 50,
      hasPurchasableQuantity: true,
      selloutFlex: true,
    })
  })

  it("keeps the standard minimum when stock is sufficient", () => {
    expect(
      resolvePurchasableQuantityRange({
        raffleMin: 1,
        raffleMax: 100,
        available: 50,
        methods: [{ min_tickets: 10 }, { min_tickets: 60 }],
      }),
    ).toEqual({
      min: 10,
      max: 50,
      hasPurchasableQuantity: true,
      selloutFlex: false,
    })
  })
})
