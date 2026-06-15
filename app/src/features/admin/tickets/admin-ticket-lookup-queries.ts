import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireAdminMiddleware } from "@/features/admin/shared/admin-auth-middleware"
import {
  getDefaultAdminRaffleId,
  resolveAdminRaffleScopeFromSearch,
} from "@/features/admin/shared/admin-raffle-scope"
import { lookupAdminTicketByNumber } from "@/server/ticket.service"

export const ADMIN_TICKET_LOOKUP_PATTERN = /^\d{1,4}$/

const AdminTicketLookupInput = z.object({
  ticket: z
    .string()
    .trim()
    .regex(ADMIN_TICKET_LOOKUP_PATTERN, "Ingresa un número de boleto entre 0000 y 9999"),
  raffleId: z.number().int().positive().nullable().optional(),
})

export type AdminTicketLookupInput = z.infer<typeof AdminTicketLookupInput>
export type AdminTicketLookupResult = Awaited<ReturnType<typeof lookupAdminTicketByNumber>>

export type AdminTicketLookupSearchParams = {
  ticket?: string
  raffle_id?: string
}

export const adminTicketLookupQueryKeys = {
  lookup: (ticket: string, raffleId: string | null) =>
    ["admin", "ticket-lookup", ticket, raffleId] as const,
}

export function getDefaultAdminTicketLookupRaffleId(
  dashboard?: Parameters<typeof getDefaultAdminRaffleId>[0],
) {
  return getDefaultAdminRaffleId(dashboard, { includePausedFallback: true })
}

export function normalizeAdminTicketLookupFilters(
  search: AdminTicketLookupSearchParams,
  options?: { defaultRaffleId?: string | null },
): { ticket: string | null; raffleId: string | null } {
  return {
    ticket: search.ticket?.trim() || null,
    raffleId: resolveAdminRaffleScopeFromSearch(search.raffle_id, options?.defaultRaffleId),
  }
}

export const fetchAdminTicketLookup = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .inputValidator(AdminTicketLookupInput)
  .handler(async ({ data }) => {
    return lookupAdminTicketByNumber(data.ticket, data.raffleId ?? null)
  })

export function adminTicketLookupQueryOptions(ticket: string, raffleId: string | null) {
  const parsedRaffleId = raffleId ? Number(raffleId) : null

  return queryOptions({
    queryKey: adminTicketLookupQueryKeys.lookup(ticket, raffleId),
    queryFn: () =>
      fetchAdminTicketLookup({
        data: {
          ticket,
          raffleId: parsedRaffleId,
        },
      }),
    enabled: ADMIN_TICKET_LOOKUP_PATTERN.test(ticket),
    staleTime: 30_000,
  })
}
