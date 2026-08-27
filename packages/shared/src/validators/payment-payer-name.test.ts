import { describe, expect, it } from "vitest"
import { paymentPayerNameValidationMessage } from "./payment-payer-name.js"

describe("paymentPayerNameValidationMessage", () => {
  it("requires a name only for Zelle", () => {
    expect(paymentPayerNameValidationMessage("zelle", "")).toBe(
      "Ingresa el nombre de quien hace el pago",
    )
    expect(paymentPayerNameValidationMessage("zelle", "   ")).toBe(
      "Ingresa el nombre de quien hace el pago",
    )
    expect(paymentPayerNameValidationMessage("zelle", undefined)).toBe(
      "Ingresa el nombre de quien hace el pago",
    )
    expect(paymentPayerNameValidationMessage("zelle", "Ana Pérez")).toBeUndefined()
  })

  it("ignores the field for other methods", () => {
    expect(paymentPayerNameValidationMessage("pago_movil", "")).toBeUndefined()
    expect(paymentPayerNameValidationMessage("binance", undefined)).toBeUndefined()
  })
})
