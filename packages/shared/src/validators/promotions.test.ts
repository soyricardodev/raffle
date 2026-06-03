import { describe, expect, it } from "vitest"
import { CreateRafflePromotionInput } from "./promotions.js"

describe("CreateRafflePromotionInput", () => {
  it("accepts valid percentage promo", () => {
    const result = CreateRafflePromotionInput.safeParse({
      name: "20% off",
      kind: "percentage",
      scope: "all_methods",
      discount_percent: 20,
      is_active: true,
    })
    expect(result.success).toBe(true)
  })

  it("rejects percentage without discount", () => {
    const result = CreateRafflePromotionInput.safeParse({
      name: "Bad",
      kind: "percentage",
      scope: "all_methods",
      is_active: true,
    })
    expect(result.success).toBe(false)
  })

  it("requires payment method when scope is payment_method", () => {
    const result = CreateRafflePromotionInput.safeParse({
      name: "Zelle promo",
      kind: "percentage",
      scope: "payment_method",
      discount_percent: 15,
      is_active: true,
    })
    expect(result.success).toBe(false)
  })

  it("rejects inverted date range", () => {
    const result = CreateRafflePromotionInput.safeParse({
      name: "Timed",
      kind: "percentage",
      scope: "all_methods",
      discount_percent: 10,
      is_active: true,
      starts_at: "2030-01-02T00:00:00.000Z",
      ends_at: "2030-01-01T00:00:00.000Z",
    })
    expect(result.success).toBe(false)
  })
})
