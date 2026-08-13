/**
 * Canonical phone digits for search/indexes.
 * Venezuelan mobiles normalize so `0412…`, `412…`, and `+58 412…` match.
 */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "")

  if (digits.startsWith("58") && digits.length === 12) {
    digits = `0${digits.slice(2)}`
  } else if (digits.length === 10 && digits.startsWith("4")) {
    digits = `0${digits}`
  }

  return digits
}
