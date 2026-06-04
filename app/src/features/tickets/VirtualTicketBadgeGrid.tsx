import { useVirtualizer } from "@tanstack/react-virtual"
import { useMemo, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import {
  chunkTicketRows,
  TICKET_GRID_COLUMNS,
  TICKET_ROW_STRIDE_PX,
} from "@/features/tickets/ticket-badge-grid"

type VirtualTicketBadgeGridProps = {
  ticketNumbers: string[]
  listId: string
  ticketCount: number
  className?: string
}

export function VirtualTicketBadgeGrid({
  ticketNumbers,
  listId,
  ticketCount,
  className,
}: VirtualTicketBadgeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = useMemo(() => chunkTicketRows(ticketNumbers, TICKET_GRID_COLUMNS), [ticketNumbers])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => TICKET_ROW_STRIDE_PX,
    overscan: 6,
  })

  return (
    <div
      ref={scrollRef}
      id={listId}
      className={className}
      role="list"
      aria-label={`Números de boletos asignados, ${ticketCount} en total. Desplázate para ver todos.`}
    >
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowTickets = rows[virtualRow.index] ?? []
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              className="absolute top-0 left-0 flex w-full gap-1"
              style={{
                height: `${TICKET_ROW_STRIDE_PX}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowTickets.map((ticket) => (
                <Badge
                  key={ticket}
                  variant="outline"
                  className="h-6 min-w-[2.75rem] flex-1 px-1 font-mono text-[10px] tabular-nums"
                  role="listitem"
                >
                  {ticket}
                </Badge>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
