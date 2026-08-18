import { describe, expect, it } from "vitest"
import { CreatePurchaseBody, parseCreatePurchaseBody } from "./index.js"

describe("CreatePurchaseBody Spanish messages", () => {
  it("returns Spanish message for invalid phone", () => {
    const result = CreatePurchaseBody.safeParse({
      raffleId: 1,
      customerName: "Juan",
      customerPhone: "123",
      customerEmail: "juan@test.com",
      customerCi: "V12345678",
      customerLocation: "Venezuela, Carabobo, Valencia",
      rafflePaymentMethodId: 1,
      paymentReference: "12345678",
      ticketQuantity: 2,
      paymentProofUrl: "/proof.jpg",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.toLowerCase().includes("teléfono"))).toBe(
        true,
      )
    }
  })

  it("returns Spanish message for missing payment method", () => {
    const result = CreatePurchaseBody.safeParse({
      raffleId: 1,
      customerName: "Juan",
      customerPhone: "04121234567",
      customerEmail: "juan@test.com",
      customerCi: "V12345678",
      customerLocation: "Venezuela, Carabobo, Valencia",
      rafflePaymentMethodId: 0,
      paymentReference: "12345678",
      ticketQuantity: 2,
      paymentProofUrl: "/proof.jpg",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes("método de pago")),
      ).toBe(true)
    }
  })

  it("accepts Venezuela locations without a municipality when the feature is off", () => {
    const result = CreatePurchaseBody.safeParse({
      raffleId: 1,
      customerName: "Juan",
      customerPhone: "04121234567",
      customerEmail: "juan@test.com",
      customerCi: "V12345678",
      customerLocation: "Venezuela, Carabobo",
      rafflePaymentMethodId: 1,
      paymentReference: "12345678",
      ticketQuantity: 2,
      paymentProofUrl: "/proof.jpg",
    })
    expect(result.success).toBe(true)
  })

  it("rejects Venezuela locations without a municipality when required", () => {
    expect(() =>
      parseCreatePurchaseBody(
        {
          raffleId: 1,
          customerName: "Juan",
          customerPhone: "04121234567",
          customerEmail: "juan@test.com",
          customerCi: "V12345678",
          customerLocation: "Venezuela, Carabobo",
          rafflePaymentMethodId: 1,
          paymentReference: "12345678",
          ticketQuantity: 2,
          paymentProofUrl: "/proof.jpg",
        },
        { requireMunicipality: true },
      ),
    ).toThrow(/municipio/)
  })
})
