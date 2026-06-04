import { z } from "zod"

function optionalTrimmedString() {
  return z
    .union([z.string(), z.undefined()])
    .optional()
    .transform((value) => {
      if (typeof value !== "string") return undefined
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : undefined
    })
}

function parseAutoSearch(value: unknown): boolean | undefined {
  if (value === true || value === 1) return true
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "1" || normalized === "true") return true
  }
  return undefined
}

const verifyRouteSearchSchema = z.object({
  phone: optionalTrimmedString(),
  email: optionalTrimmedString(),
  cedula: optionalTrimmedString(),
  ticket: optionalTrimmedString(),
  auto: z.unknown().optional().transform(parseAutoSearch),
})

export type VerifyRouteSearch = {
  phone?: string
  email?: string
  cedula?: string
  ticket?: string
  auto?: boolean
}

export function emptyVerifySearch(): VerifyRouteSearch {
  return {}
}

export function parseVerifyRouteSearchInput(
  search: Record<string, unknown>,
): VerifyRouteSearch {
  const parsed = verifyRouteSearchSchema.parse(search)
  const result: VerifyRouteSearch = {}

  if (parsed.phone) result.phone = parsed.phone
  if (parsed.email) result.email = parsed.email
  if (parsed.cedula) result.cedula = parsed.cedula
  if (parsed.ticket) result.ticket = parsed.ticket
  if (parsed.auto === true) result.auto = true

  return result
}
