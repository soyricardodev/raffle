import {
  DEFAULT_PAYMENT_REFERENCE_MIN_LENGTH,
  paymentReferenceValidationMessage,
  resolvePaymentReferenceMinLength,
} from "./payment-reference.js"
import { describe, expect, it } from "vitest"

describe("payment reference helpers", () => {
  it("uses 8 as default minimum length", () => {
    expect(resolvePaymentReferenceMinLength(null)).toBe(DEFAULT_PAYMENT_REFERENCE_MIN_LENGTH)
    expect(resolvePaymentReferenceMinLength(undefined)).toBe(8)
  })

  it("uses custom minimum when configured", () => {
    expect(resolvePaymentReferenceMinLength(12)).toBe(12)
  })

  it("validates reference length per method minimum", () => {
    expect(paymentReferenceValidationMessage("", 8)).toBe("Ingresa la referencia de pago")
    expect(paymentReferenceValidationMessage("1234567", 8)).toBe(
      "La referencia debe tener al menos 8 caracteres",
    )
    expect(paymentReferenceValidationMessage("12345678", 8)).toBeUndefined()
    expect(paymentReferenceValidationMessage("123456789", 10)).toBe(
      "La referencia debe tener al menos 10 caracteres",
    )
  })
})
