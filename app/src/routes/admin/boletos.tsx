import { createFileRoute } from "@tanstack/react-router"
import { AdminTicketLookup } from "@/features/admin/AdminTicketLookup"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"
import { adminPurchasesDashboardQueryOptions } from "@/features/admin/purchases/admin-purchases-queries"
import {
  getDefaultAdminTicketLookupRaffleId,
  normalizeAdminTicketLookupFilters,
} from "@/features/admin/tickets/admin-ticket-lookup-queries"

type BoletosSearch = {
  ticket?: string
  raffle_id?: string
}

export const Route = createFileRoute("/admin/boletos")({
  validateSearch: (search: Record<string, unknown>): BoletosSearch => ({
    ticket: typeof search.ticket === "string" ? search.ticket : undefined,
    raffle_id: typeof search.raffle_id === "string" ? search.raffle_id : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const dashboard = await queryClient
      .ensureQueryData(adminPurchasesDashboardQueryOptions())
      .catch(() => null)
    normalizeAdminTicketLookupFilters(deps, {
      defaultRaffleId: getDefaultAdminTicketLookupRaffleId(dashboard),
    })
  },
  head: ({ matches }) => adminNavRouteHead(matches, "/admin/boletos"),
  component: AdminTicketLookup,
})
