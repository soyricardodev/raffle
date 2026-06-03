/** True when the value looks like an email (contains @). */
export function looksLikeZelleEmail(value: string): boolean {
  return value.trim().includes("@")
}

function isLikelyPhoneInput(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (looksLikeZelleEmail(trimmed)) return false
  if (/[a-zA-Z]/.test(trimmed)) return false
  return true
}

export function getZelleContactLabel(value: string): string {
  if (!value.trim()) return "Correo o teléfono"
  if (looksLikeZelleEmail(value) || /[a-zA-Z]/.test(value)) return "Correo"
  return "Teléfono"
}

export function getZelleContactInputType(value: string): "email" | "tel" | "text" {
  if (!value.trim()) return "text"
  if (looksLikeZelleEmail(value) || /[a-zA-Z]/.test(value)) return "email"
  return "tel"
}

export function getZelleContactValue(info: Record<string, string>): string {
  return (info.email ?? info.phone ?? info.contact ?? info.account ?? "").trim()
}

export function zelleContactDraftPatch(
  info: Record<string, string>,
  value: string,
): Record<string, string> {
  const next = { ...info }
  delete next.email
  delete next.phone
  delete next.account

  const normalizedValue = isLikelyPhoneInput(value) ? value.replace(/\D/g, "") : value.trim()
  next.contact = normalizedValue

  if (!normalizedValue) return next

  if (looksLikeZelleEmail(normalizedValue)) {
    next.email = normalizedValue
  } else if (isLikelyPhoneInput(normalizedValue)) {
    next.phone = normalizedValue
  } else {
    next.email = normalizedValue
  }

  return next
}
