import { describe, expect, it } from "vitest"
import { parsePurchaseFromJson } from "./parse-create-purchase"

const base = {
  raffleId: 1,
  customerName: "María González",
  customerPhone: "04121234567",
  customerEmail: "maria@test.local",
  customerCi: "V12345678",
  rafflePaymentMethodId: 1,
  paymentReference: "12345678",
  ticketQuantity: 2,
  paymentProofUrl: "/proof.jpg",
}

describe("parsePurchaseFromJson location", () => {
  it("maps Venezuela state and municipality", () => {
    const params = parsePurchaseFromJson({
      ...base,
      customerLocation: "Venezuela, Carabobo, Valencia",
    })
    expect(params.locationType).toBe("venezuela")
    expect(params.venezuelaState).toBe("Carabobo")
    expect(params.venezuelaMunicipality).toBe("Valencia")
  })

  it("rejects a Venezuela location without municipality", () => {
    expect(() =>
      parsePurchaseFromJson({
        ...base,
        customerLocation: "Venezuela, Carabobo",
      }),
    ).toThrow(/municipio/)
  })

  it("still accepts international free text", () => {
    const params = parsePurchaseFromJson({
      ...base,
      customerLocation: "Colombia, Bogotá",
    })
    expect(params.locationType).toBe("other")
    expect(params.venezuelaState).toBeNull()
    expect(params.venezuelaMunicipality).toBeNull()
  })
})
