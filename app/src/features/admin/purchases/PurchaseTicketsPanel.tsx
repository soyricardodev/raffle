import { Search, Ticket } from "lucide-react"
import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { parseTicketNumbers } from "@/features/admin/purchases/parseTicketNumbers"
import { shouldVirtualizeTicketBadgeList } from "@/features/tickets/ticket-badge-grid"
import {
  ADMIN_PURCHASE_TICKET_ROW_STRIDE_PX,
  adminPurchaseTicketBadgeClassName,
  adminPurchaseTicketBadgeGridClassName,
} from "@/features/tickets/ticket-badge-styles"
import { TICKET_GRID_COLUMNS } from "@/features/tickets/ticket-badge-grid"
import { VirtualTicketBadgeGrid } from "@/features/tickets/VirtualTicketBadgeGrid"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { cn } from "@/lib/utils"

type PurchaseTicketsPanelProps = {
  ticketNumbers?: Array<string>
  ticketNumbersCsv?: string
  className?: string
  toolbarEnd?: ReactNode
}

export function PurchaseTicketsPanel({
  ticketNumbers,
  ticketNumbersCsv,
  className,
  toolbarEnd,
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

  return (
    <section className={cn("flex flex-col gap-1", className)}>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className="flex shrink-0 items-center gap-1">
            <Ticket className="text-muted-foreground size-3 shrink-0" />
            <h3 className="text-[11px] font-medium uppercase text-muted-foreground">Boletos</h3>
            <Badge variant="secondary" className="h-4 px-1 text-[10px] tabular-nums">
              {allTickets.length}
            </Badge>
            {isFiltering ? (
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {filteredTickets.length}/{allTickets.length}
              </span>
            ) : null}
          </div>

          <div className="relative min-w-0 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="h-7 pl-7 text-xs"
              aria-label="Filtrar boletos"
              disabled={allTickets.length === 0}
            />
          </div>
        </div>

        {toolbarEnd ? <div className="w-full">{toolbarEnd}</div> : null}
      </div>

      {allTickets.length === 0 ? (
        <p className="text-muted-foreground text-[11px]">Sin números asignados todavía.</p>
      ) : (
        <div
          className={cn(
            adminPurchaseTicketBadgeGridClassName,
            useVirtualList ? "min-h-24 max-h-80" : "min-h-20 max-h-64",
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
              className="max-h-72 overflow-y-auto overscroll-contain"
              badgeClassName={adminPurchaseTicketBadgeClassName}
              rowStridePx={ADMIN_PURCHASE_TICKET_ROW_STRIDE_PX}
              columns={TICKET_GRID_COLUMNS + 4}
            />
          ) : (
            <div className="flex flex-wrap gap-1">
              {filteredTickets.map((ticket) => (
                <Badge
                  key={ticket}
                  variant="outline"
                  className={adminPurchaseTicketBadgeClassName}
                  role="listitem"
                >
                  {ticket}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
