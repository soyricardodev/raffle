import type { PaymentMethod } from "../payment-methods/types.js"

export const DEFAULT_PAYMENT_REFERENCE_MIN_LENGTH = 8
export const PAYMENT_REFERENCE_MAX_LENGTH = 100

export type PaymentReferenceInputMode = "numeric" | "alphanumeric"

export type PaymentReferencePolicy = {
  minLength: number
  inputMode: PaymentReferenceInputMode
}

export function resolvePaymentReferenceMinLength(customMin?: number | null): number {
  if (customMin != null && customMin > 0) return customMin
  return DEFAULT_PAYMENT_REFERENCE_MIN_LENGTH
}

/** Solo pago móvil exige referencia numérica; el resto acepta letras y números. */
export function resolvePaymentReferenceInputMode(
  methodType?: PaymentMethod | null,
): PaymentReferenceInputMode {
  return methodType === "pago_movil" ? "numeric" : "alphanumeric"
}

export function resolvePaymentReferencePolicy(
  methodType?: PaymentMethod | null,
  customMin?: number | null,
): PaymentReferencePolicy {
  return {
    minLength: resolvePaymentReferenceMinLength(customMin),
    inputMode: resolvePaymentReferenceInputMode(methodType),
  }
}

export function sanitizePaymentReference(
  value: string,
  mode: PaymentReferenceInputMode,
): string {
  if (mode === "numeric") {
    return value.replace(/\D/g, "")
  }
  return value.replace(/[^a-zA-Z0-9]/g, "")
}

export function paymentReferenceValidationMessage(
  reference: string,
  minLength: number,
  mode: PaymentReferenceInputMode = "alphanumeric",
): string | undefined {
  const trimmed = reference.trim()

  if (!trimmed) {
    return mode === "numeric"
      ? "Ingresa los últimos dígitos de tu pago"
      : "Ingresa la referencia de tu pago"
  }

  if (mode === "numeric" && !/^\d+$/.test(trimmed)) {
    return "La referencia solo puede contener números"
  }

  if (mode === "alphanumeric" && !/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return "La referencia solo puede contener letras y números"
  }

  if (trimmed.length < minLength) {
    return mode === "numeric"
      ? `Debes ingresar al menos los últimos ${minLength} dígitos`
      : `Debes ingresar al menos ${minLength} caracteres`
  }

  return undefined
}
