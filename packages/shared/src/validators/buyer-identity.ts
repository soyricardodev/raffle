import { z } from "zod"

export const CedulaPrefix = z.enum(["V", "E", "J"])
export type CedulaPrefix = z.infer<typeof CedulaPrefix>

export const CountryScope = z.enum(["venezuela", "other"])
export type CountryScope = z.infer<typeof CountryScope>

const CI_BODY_RE = /^(\d{6,9})$/
const PHONE_MAX_DISPLAY_CHARS = 20

export function normalizeCountryScope(value: string): CountryScope {
  if (value === "international") return "other"
  if (value === "venezuela" || value === "other") return value
  return "venezuela"
}

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

/**
 * Free-form phone sanitizer: keeps digits and common phone symbols (+, spaces, -, ()).
 * Accepts both national (`0412…`) and international (`+58…`) input.
 */
export function sanitizePhoneInput(value: string): string {
  const trimmed = value.trimStart()
  const wantsPlus = trimmed.startsWith("+")
  const body = trimmed.replace(/[^\d\s\-()]/g, "")
  const withPlus = wantsPlus ? `+${body}` : body
  return withPlus.slice(0, PHONE_MAX_DISPLAY_CHARS)
}

export function phoneDigitCount(phone: string): number {
  return phone.replace(/\D/g, "").length
}

/** Free-form phone: 7–15 digits after stripping symbols (E.164-compatible). */
export function isValidCustomerPhone(phone: string): boolean {
  const trimmed = phone.trim()
  if (!trimmed) return false
  const digits = phoneDigitCount(trimmed)
  return digits >= 7 && digits <= 15
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
  .min(1, "Ingresa tu teléfono")
  .max(PHONE_MAX_DISPLAY_CHARS, "Teléfono demasiado largo")
  .refine((v) => isValidCustomerPhone(v), "Teléfono inválido (ej: +58 412… o 0412…)")
