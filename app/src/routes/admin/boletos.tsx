import { createFileRoute } from "@tanstack/react-router"
import { AdminTicketLookup } from "@/features/admin/AdminTicketLookup"

type BoletosSearch = {
  ticket?: string
}

export const Route = createFileRoute("/admin/boletos")({
  validateSearch: (search: Record<string, unknown>): BoletosSearch => ({
    ticket: typeof search.ticket === "string" ? search.ticket : undefined,
  }),
  component: AdminTicketLookup,
})
