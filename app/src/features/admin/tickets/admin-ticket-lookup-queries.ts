import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireAdminMiddleware } from "@/features/admin/shared/admin-auth-middleware"
import { lookupAdminTicketByNumber } from "@/server/ticket.service"

const AdminTicketLookupInput = z.object({
  ticket: z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, "Ingresa un número de boleto entre 0000 y 9999"),
})

export type AdminTicketLookupInput = z.infer<typeof AdminTicketLookupInput>
export type AdminTicketLookupResult = Awaited<
  ReturnType<typeof lookupAdminTicketByNumber>
>

export const adminTicketLookupQueryKeys = {
  lookup: (ticket: string) => ["admin", "ticket-lookup", ticket] as const,
}

export const fetchAdminTicketLookup = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .inputValidator(AdminTicketLookupInput)
  .handler(async ({ data }) => {
    return lookupAdminTicketByNumber(data.ticket)
  })

export function adminTicketLookupQueryOptions(ticket: string) {
  return queryOptions({
    queryKey: adminTicketLookupQueryKeys.lookup(ticket),
    queryFn: () => fetchAdminTicketLookup({ data: { ticket } }),
    enabled: /^\d{1,4}$/.test(ticket),
    staleTime: 30_000,
  })
}
