import { Search, Ticket } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { parseTicketNumbers } from "@/features/admin/purchases/parseTicketNumbers"
import { shouldVirtualizeTicketBadgeList } from "@/features/tickets/ticket-badge-grid"
import {
  FEATURED_TICKET_ROW_STRIDE_PX,
  featuredTicketBadgeClassName,
  featuredTicketBadgeGridClassName,
} from "@/features/tickets/ticket-badge-styles"
import { VirtualTicketBadgeGrid } from "@/features/tickets/VirtualTicketBadgeGrid"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { cn } from "@/lib/utils"

type PurchaseTicketsPanelProps = {
  ticketNumbers?: Array<string>
  ticketNumbersCsv?: string
  className?: string
}

export function PurchaseTicketsPanel({
  ticketNumbers,
  ticketNumbersCsv,
  className,
}: PurchaseTicketsPanelProps) {
  const [query, setQuery] = useState("")

  const allTickets = useMemo(
    () => parseTicketNumbers(ticketNumbers, ticketNumbersCsv),
    [ticketNumbers, ticketNumbersCsv],
  )

  const debouncedQuery = useDebouncedValue(query, 300)

  const filteredTickets = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase()
    if (!needle) return allTickets
    return allTickets.filter((ticket) => ticket.toLowerCase().includes(needle))
  }, [allTickets, debouncedQuery])

  const isFiltering = debouncedQuery.trim().length > 0
  const useVirtualList = shouldVirtualizeTicketBadgeList(filteredTickets.length)

  if (allTickets.length === 0) {
    return (
      <p className={cn("text-muted-foreground text-[11px]", className)}>
        Sin números asignados todavía.
      </p>
    )
  }

  return (
    <section className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Ticket className="text-muted-foreground size-3 shrink-0" />
          <h3 className="text-[11px] font-medium uppercase text-muted-foreground">Boletos</h3>
          <Badge variant="secondary" className="h-4 px-1 text-[10px] tabular-nums">
            {allTickets.length}
          </Badge>
        </div>
        {isFiltering && (
          <span className="text-muted-foreground text-[10px] tabular-nums">
            {filteredTickets.length}/{allTickets.length}
          </span>
        )}
      </div>

      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar…"
          className="h-7 pl-7 text-xs"
          aria-label="Filtrar boletos"
        />
      </div>

      <div
        className={cn(
          featuredTicketBadgeGridClassName,
          useVirtualList ? "max-h-52" : "max-h-36",
        )}
        role="list"
        aria-label="Lista de boletos"
      >
        {filteredTickets.length === 0 ? (
          <p className="text-muted-foreground px-1 py-3 text-center text-[11px]">
            Sin coincidencias
          </p>
        ) : useVirtualList ? (
          <VirtualTicketBadgeGrid
            ticketNumbers={filteredTickets}
            listId="admin-purchase-tickets"
            ticketCount={filteredTickets.length}
            className="max-h-48 overflow-y-auto overscroll-contain"
            badgeClassName={featuredTicketBadgeClassName}
            rowStridePx={FEATURED_TICKET_ROW_STRIDE_PX}
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filteredTickets.map((ticket) => (
              <Badge
                key={ticket}
                variant="outline"
                className={featuredTicketBadgeClassName}
                role="listitem"
              >
                {ticket}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
