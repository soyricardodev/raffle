export const CONTACTS_LABEL = "Compradores de rifa"
export const PHONE_LABEL = "Móvil"

const JUNK_NAME_EXACT = new Set(["na", "n/a", "none", "null", "xxx", "aaa", "test", "prueba", ".", "-"])

type SanitizedPhone = {
  digits: string
  formatted: string
}

export function isJunkName(name: string): boolean {
  const trimmed = name.trim()
  if (trimmed.length < 2) return true

  const lower = trimmed.toLowerCase()
  if (JUNK_NAME_EXACT.has(lower)) return true
  if (/asdasd|asdfgh|qwerty|test123|prueba123/.test(lower)) return true
  if (/^(.)\1{4,}$/.test(lower.replace(/\s/g, ""))) return true

  return false
}

export function titleCaseName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (!word) return word
      const lower = word.toLocaleLowerCase("es-VE")
      return lower.charAt(0).toLocaleUpperCase("es-VE") + lower.slice(1)
    })
    .join(" ")
}

export function normalizeVeMobileDigits(phone: string): string | null {
  let raw = phone.trim()
  if (/^o(?=\d)/i.test(raw)) {
    raw = `0${raw.slice(1)}`
  }

  let digits = raw.replace(/\D/g, "")

  if (digits.length === 10 && digits.startsWith("4")) {
    digits = `0${digits}`
  }

  if (digits.startsWith("58") && digits.length === 12) {
    digits = `0${digits.slice(2)}`
  }

  if (!/^04\d{9}$/.test(digits)) return null
  return digits
}

export function formatVeMobileForGoogleContacts(digits: string): string {
  return `+58 ${digits.slice(1, 4)} ${digits.slice(4)}`
}

export function sanitizePhone(phone: string): SanitizedPhone | null {
  const digits = normalizeVeMobileDigits(phone)
  if (!digits) return null
  return {
    digits,
    formatted: formatVeMobileForGoogleContacts(digits),
  }
}

export function sanitizeCustomerName(name: string, phoneDigits: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ")
  if (isJunkName(trimmed)) return null

  const hasLetters = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(trimmed)
  if (!hasLetters) {
    return titleCaseName(`Cliente ${phoneDigits.slice(-4)}`)
  }

  if (trimmed.replace(/\D/g, "") === phoneDigits) {
    return titleCaseName(`Cliente ${phoneDigits.slice(-4)}`)
  }

  return titleCaseName(trimmed)
}

export function formatPurchaseNote(lastPurchaseAt: number, raffleName: string): string {
  const formattedDate = new Date(lastPurchaseAt).toLocaleDateString("es-VE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Caracas",
  })

  return `Última compra: ${formattedDate} — Rifa: ${raffleName.trim()}`
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, " ")
  if (!trimmed) return { firstName: "", lastName: "" }
  const spaceIndex = trimmed.indexOf(" ")
  if (spaceIndex === -1) return { firstName: trimmed, lastName: "" }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1),
  }
}
