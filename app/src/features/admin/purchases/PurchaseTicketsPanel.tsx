import { Search, Ticket } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { parseTicketNumbers } from "@/features/admin/purchases/parseTicketNumbers"
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

  if (allTickets.length === 0) {
    return (
      <p className={cn("text-muted-foreground text-xs", className)}>
        Sin números asignados todavía.
      </p>
    )
  }

  return (
    <section className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Ticket className="text-muted-foreground size-3.5 shrink-0" />
          <h3 className="text-xs font-medium">Boletos</h3>
          <Badge variant="secondary" className="h-5 px-1.5 tabular-nums">
            {allTickets.length}
          </Badge>
        </div>
        {isFiltering && (
          <span className="text-muted-foreground text-[11px] tabular-nums">
            {filteredTickets.length} de {allTickets.length}
          </span>
        )}
      </div>

      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar número…"
          className="h-9 pl-9 text-sm"
          aria-label="Filtrar boletos"
        />
      </div>

      <div
        className="bg-muted/30 max-h-28 overflow-y-auto overscroll-contain rounded-md border p-1.5"
        role="list"
        aria-label="Lista de boletos"
      >
        {filteredTickets.length === 0 ? (
          <p className="text-muted-foreground px-1 py-6 text-center text-xs">
            Ningún boleto coincide con &quot;{debouncedQuery.trim()}&quot;
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filteredTickets.map((ticket) => (
              <Badge
                key={ticket}
                variant="outline"
                className="font-mono text-xs tabular-nums"
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
