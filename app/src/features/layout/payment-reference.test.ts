import { describe, expect, it } from "vitest"
import { CreatePurchaseBody } from "@raffle/shared/validators"

describe("CreatePurchaseBody paymentReference", () => {
  const base = {
    raffleId: 1,
    customerName: "Test User",
    customerPhone: "04121234567",
    customerEmail: "test@example.com",
    customerCi: "V12345678",
    customerLocation: "Venezuela, Carabobo",
    rafflePaymentMethodId: 1,
    ticketQuantity: 1,
    paymentProofUrl: "/proof.jpg",
  }

  it("rejects references shorter than 10 characters", () => {
    const result = CreatePurchaseBody.safeParse({
      ...base,
      paymentReference: "123456789",
    })
    expect(result.success).toBe(false)
  })

  it("accepts references with at least 10 characters", () => {
    const result = CreatePurchaseBody.safeParse({
      ...base,
      paymentReference: "1234567890",
    })
    expect(result.success).toBe(true)
  })
})
