export const DEFAULT_PAYMENT_REFERENCE_MIN_LENGTH = 8
export const PAYMENT_REFERENCE_MAX_LENGTH = 100

export function resolvePaymentReferenceMinLength(customMin?: number | null): number {
  if (customMin != null && customMin > 0) return customMin
  return DEFAULT_PAYMENT_REFERENCE_MIN_LENGTH
}

export function paymentReferenceValidationMessage(
  reference: string,
  minLength: number,
): string | undefined {
  const trimmed = reference.trim()
  if (!trimmed) return "Ingresa la referencia de pago"
  if (trimmed.length < minLength) {
    return `La referencia debe tener al menos ${minLength} caracteres`
  }
  return undefined
}
