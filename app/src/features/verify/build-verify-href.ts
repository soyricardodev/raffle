import { emptyVerifySearch, type VerifyRouteSearch } from "@/features/verify/verify-route-search"

export type BuildVerifyHrefOptions = {
  phone?: string
  email?: string
  cedula?: string
  ticket?: string
  auto?: boolean
}

export function buildVerifyHref(options: BuildVerifyHrefOptions = {}) {
  const search: VerifyRouteSearch = emptyVerifySearch()

  const phone = options.phone?.trim()
  if (phone) search.phone = phone

  const email = options.email?.trim()
  if (email) search.email = email

  const cedula = options.cedula?.trim()
  if (cedula) search.cedula = cedula

  const ticket = options.ticket?.trim()
  if (ticket) search.ticket = ticket

  if (options.auto) search.auto = true

  return {
    to: "/verificar" as const,
    search,
  }
}
