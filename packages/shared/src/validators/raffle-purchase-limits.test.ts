import { describe, expect, it } from "vitest"
import { CreateRaffleInput, UpdateRaffleInput } from "./index.js"

const validRaffle = {
  name: "Rifa test",
  price_bs: 10,
  price_usd: 1,
  min_purchase: 2,
  max_purchase: 10,
}

describe("raffle purchase limits", () => {
  it("accepts min less than or equal to max on create", () => {
    expect(CreateRaffleInput.safeParse(validRaffle).success).toBe(true)
    expect(
      CreateRaffleInput.safeParse({ ...validRaffle, min_purchase: 5, max_purchase: 5 }).success,
    ).toBe(true)
  })

  it("rejects min greater than max on create", () => {
    const result = CreateRaffleInput.safeParse({
      ...validRaffle,
      min_purchase: 1000,
      max_purchase: 10,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("max_purchase"))).toBe(true)
    }
  })

  it("rejects inverted limits on update when both are present", () => {
    const result = UpdateRaffleInput.safeParse({ min_purchase: 20, max_purchase: 5 })
    expect(result.success).toBe(false)
  })

  it("allows a partial update that does not send both limits", () => {
    expect(UpdateRaffleInput.safeParse({ name: "Otra rifa" }).success).toBe(true)
    expect(UpdateRaffleInput.safeParse({ min_purchase: 3 }).success).toBe(true)
    expect(UpdateRaffleInput.safeParse({ min_purchase: 20 }).success).toBe(true)
  })
})
