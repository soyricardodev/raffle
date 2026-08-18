import { CreatePurchaseBody } from "@raffle/shared/validators"
import { describe, expect, it } from "vitest"

describe("CreatePurchaseBody paymentReference", () => {
  const base = {
    raffleId: 1,
    customerName: "Test User",
    customerPhone: "04121234567",
    customerEmail: "test@example.com",
    customerCi: "V12345678",
    customerLocation: "Venezuela, Carabobo, Valencia",
    rafflePaymentMethodId: 1,
    ticketQuantity: 1,
    paymentProofUrl: "/proof.jpg",
  }

  it("rejects empty references", () => {
    const result = CreatePurchaseBody.safeParse({
      ...base,
      paymentReference: "   ",
    })
    expect(result.success).toBe(false)
  })

  it("accepts non-empty references (length validated per method on server)", () => {
    const result = CreatePurchaseBody.safeParse({
      ...base,
      paymentReference: "1234567",
    })
    expect(result.success).toBe(true)
  })
})
