import { afterEach, describe, expect, it } from "vitest"
import { resetEnvCache } from "@/lib/env"
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
  afterEach(() => {
    delete process.env.ENABLE_VENEZUELA_MUNICIPALITY
    resetEnvCache()
  })

  it("maps Venezuela state and municipality", () => {
    const params = parsePurchaseFromJson({
      ...base,
      customerLocation: "Venezuela, Carabobo, Valencia",
    })
    expect(params.locationType).toBe("venezuela")
    expect(params.venezuelaState).toBe("Carabobo")
    expect(params.venezuelaMunicipality).toBe("Valencia")
  })

  it("accepts a Venezuela location without municipality when the feature is off", () => {
    delete process.env.ENABLE_VENEZUELA_MUNICIPALITY
    resetEnvCache()
    const params = parsePurchaseFromJson({
      ...base,
      customerLocation: "Venezuela, Carabobo",
    })
    expect(params.venezuelaState).toBe("Carabobo")
    expect(params.venezuelaMunicipality).toBeNull()
  })

  it("rejects a Venezuela location without municipality when the feature is on", () => {
    process.env.ENABLE_VENEZUELA_MUNICIPALITY = "true"
    resetEnvCache()
    expect(() =>
      parsePurchaseFromJson({
        ...base,
        customerLocation: "Venezuela, Carabobo",
      }),
    ).toThrow(/municipio/)
  })
})
