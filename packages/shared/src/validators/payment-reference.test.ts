import {
  DEFAULT_PAYMENT_REFERENCE_MIN_LENGTH,
  paymentReferenceValidationMessage,
  resolvePaymentReferenceInputMode,
  resolvePaymentReferenceMinLength,
  resolvePaymentReferencePolicy,
  sanitizePaymentReference,
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

  it("resolves input mode by payment method", () => {
    expect(resolvePaymentReferenceInputMode("pago_movil")).toBe("numeric")
    expect(resolvePaymentReferenceInputMode("zelle")).toBe("alphanumeric")
    expect(resolvePaymentReferenceInputMode("binance")).toBe("alphanumeric")
    expect(resolvePaymentReferenceInputMode("bs")).toBe("alphanumeric")
    expect(resolvePaymentReferenceInputMode(null)).toBe("alphanumeric")
    expect(resolvePaymentReferenceInputMode(undefined)).toBe("alphanumeric")
  })

  it("resolves policy from method and custom minimum", () => {
    expect(resolvePaymentReferencePolicy("pago_movil", 10)).toEqual({
      minLength: 10,
      inputMode: "numeric",
    })
    expect(resolvePaymentReferencePolicy("zelle", null)).toEqual({
      minLength: DEFAULT_PAYMENT_REFERENCE_MIN_LENGTH,
      inputMode: "alphanumeric",
    })
  })

  it("sanitizes reference input", () => {
    expect(sanitizePaymentReference("12ab-34", "numeric")).toBe("1234")
    expect(sanitizePaymentReference("12ab-34", "alphanumeric")).toBe("12ab34")
    expect(sanitizePaymentReference("REF#2024!", "alphanumeric")).toBe("REF2024")
  })

  it("validates numeric reference length", () => {
    expect(paymentReferenceValidationMessage("", 8, "numeric")).toBe(
      "Ingresa los últimos dígitos de tu pago",
    )
    expect(paymentReferenceValidationMessage("1234567", 8, "numeric")).toBe(
      "Debes ingresar al menos los últimos 8 dígitos",
    )
    expect(paymentReferenceValidationMessage("12345678", 8, "numeric")).toBeUndefined()
    expect(paymentReferenceValidationMessage("abc12345", 8, "numeric")).toBe(
      "La referencia solo puede contener números",
    )
  })

  it("validates alphanumeric reference length", () => {
    expect(paymentReferenceValidationMessage("", 8, "alphanumeric")).toBe(
      "Ingresa la referencia de tu pago",
    )
    expect(paymentReferenceValidationMessage("REF1234", 8, "alphanumeric")).toBe(
      "Debes ingresar al menos 8 caracteres",
    )
    expect(paymentReferenceValidationMessage("REF12345", 8, "alphanumeric")).toBeUndefined()
    expect(paymentReferenceValidationMessage("REF-12345", 8, "alphanumeric")).toBe(
      "La referencia solo puede contener letras y números",
    )
  })
})
