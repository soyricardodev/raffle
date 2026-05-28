import { z } from "zod"

export const CedulaPrefix = z.enum(["V", "E", "J"])
export type CedulaPrefix = z.infer<typeof CedulaPrefix>

export const VENEZUELAN_MOBILE_PREFIXES = ["0412", "0414", "0422", "0424", "0426"] as const
export type VenezuelanMobilePrefix = (typeof VENEZUELAN_MOBILE_PREFIXES)[number]

export type PhoneInputMode = "venezuela" | "international"

const CI_BODY_RE = /^(\d{6,9})$/

export function parseCustomerCi(raw: string): { prefix: CedulaPrefix; number: string } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const compact = trimmed.replace(/[\s\-.]/g, "").toUpperCase()
  const withPrefix = compact.match(/^([VEJ])(\d{6,9})$/)
  if (withPrefix) {
    return {
      prefix: withPrefix[1] as CedulaPrefix,
      number: withPrefix[2]!,
    }
  }

  const digitsOnly = compact.replace(/\D/g, "")
  if (CI_BODY_RE.test(digitsOnly)) {
    return { prefix: "V", number: digitsOnly }
  }

  return null
}

export function formatCustomerCi(prefix: CedulaPrefix, number: string): string {
  const digits = number.replace(/\D/g, "")
  return `${prefix}${digits}`
}

/** Stable key for DB unique index and lookups. */
export function normalizeCustomerCi(ci: string): string {
  const parsed = parseCustomerCi(ci)
  if (!parsed) {
    return ci.replace(/[\s\-.VEJvej]/g, "").toUpperCase()
  }
  return `${parsed.prefix}${parsed.number}`
}

export function isValidCustomerCi(ci: string): boolean {
  return parseCustomerCi(ci) != null
}

export function sanitizeCiDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 9)
}

export function sanitizePhoneInput(value: string, mode: PhoneInputMode): string {
  if (mode === "international") {
    const hasPlus = value.startsWith("+")
    const digits = value.replace(/[^\d+]/g, "")
    if (!hasPlus && value.includes("+")) {
      return `+${digits.replace(/\+/g, "")}`
    }
    if (digits.startsWith("+")) return `+${digits.slice(1).replace(/\D/g, "")}`
    return digits.replace(/\D/g, "")
  }
  return value.replace(/\D/g, "").slice(0, 11)
}

export function isValidVenezuelanMobile(phone: string): boolean {
  const digits = phone.replace(/\D/g, "")
  if (digits.length !== 11 || !digits.startsWith("0")) return false
  const prefix = digits.slice(0, 4)
  return (VENEZUELAN_MOBILE_PREFIXES as readonly string[]).includes(prefix)
}

export function isValidInternationalPhone(phone: string): boolean {
  if (!phone.startsWith("+")) return false
  const digits = phone.slice(1).replace(/\D/g, "")
  return digits.length >= 8 && digits.length <= 15
}

export function isValidCustomerPhone(phone: string, mode: PhoneInputMode): boolean {
  const trimmed = phone.trim()
  if (!trimmed) return false
  if (mode === "international") return isValidInternationalPhone(trimmed)
  return isValidVenezuelanMobile(trimmed)
}

export const CustomerEmail = z
  .string()
  .trim()
  .min(1, "Ingresa tu email")
  .email("Email inválido")
  .max(100)

export const CustomerCi = z
  .string()
  .trim()
  .min(1, "Ingresa tu cédula")
  .refine((v) => isValidCustomerCi(v), "Cédula inválida (ej: V12345678)")

export const CustomerPhone = z
  .string()
  .trim()
  .min(7, "Teléfono muy corto")
  .max(20, "Teléfono muy largo")
