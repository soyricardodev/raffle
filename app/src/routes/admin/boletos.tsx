import { createFileRoute } from "@tanstack/react-router"
import { AdminTicketLookup } from "@/features/admin/AdminTicketLookup"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"

type BoletosSearch = {
  ticket?: string
}

export const Route = createFileRoute("/admin/boletos")({
  validateSearch: (search: Record<string, unknown>): BoletosSearch => ({
    ticket: typeof search.ticket === "string" ? search.ticket : undefined,
  }),
  head: ({ matches }) => adminNavRouteHead(matches, "/admin/boletos"),
  component: AdminTicketLookup,
})
