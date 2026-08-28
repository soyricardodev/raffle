export const PAYMENT_PAYER_NAME_MAX_LENGTH = 200

/** Required only for Zelle. Other methods and empty legacy rows stay valid. */
export function paymentPayerNameValidationMessage(
  methodType: string | undefined,
  value: string | undefined,
): string | undefined {
  if (methodType !== "zelle") return undefined
  if (!value?.trim()) return "Ingresa el nombre y apellido del propietario de la cuenta Zelle"
  return undefined
}
