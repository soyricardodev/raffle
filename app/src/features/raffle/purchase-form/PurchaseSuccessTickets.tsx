import { ChevronDown, ChevronUp, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getHiddenTicketCount,
  getTicketListDisplayMode,
  getVisibleTicketNumbers,
  TICKET_COLLAPSE_THRESHOLD,
} from "@/features/raffle/purchase-form/purchase-success-tickets"
import { VirtualTicketBadgeGrid } from "@/features/raffle/purchase-form/VirtualTicketBadgeGrid"
import { cn } from "@/lib/utils"

type PurchaseSuccessTicketsProps = {
  purchaseId: number
  ticketNumbers: string[]
  onCopy: () => void
  onExpandedChange?: (expanded: boolean) => void
}

const listScrollClassName =
  "bg-background/70 min-h-0 overflow-y-auto overscroll-contain rounded-md border p-1.5"

export function PurchaseSuccessTickets({
  purchaseId,
  ticketNumbers,
  onCopy,
  onExpandedChange,
}: PurchaseSuccessTicketsProps) {
  const ticketCount = ticketNumbers.length
  const manyTickets = ticketCount > TICKET_COLLAPSE_THRESHOLD
  const [expanded, setExpanded] = useState(ticketCount <= TICKET_COLLAPSE_THRESHOLD)

  useEffect(() => {
    setExpanded(ticketCount <= TICKET_COLLAPSE_THRESHOLD)
  }, [purchaseId, ticketCount])

  const displayMode = getTicketListDisplayMode(ticketCount, expanded)
  const visibleTickets = getVisibleTicketNumbers(ticketNumbers, displayMode)
  const hiddenTicketCount = getHiddenTicketCount(ticketCount, displayMode)
  const listId = `purchase-success-tickets-${purchaseId}`

  function toggleExpanded() {
    setExpanded((current) => {
      const next = !current
      onExpandedChange?.(next)
      return next
    })
  }

  return (
    <div className="from-primary/8 to-primary/4 flex min-h-0 flex-1 flex-col rounded-xl border bg-gradient-to-br p-3">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Compra #{purchaseId}
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {ticketCount} boleto{ticketCount === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1 px-2.5 text-xs"
          onClick={onCopy}
          aria-label={`Copiar ${ticketCount} números de boletos`}
        >
          <Copy className="size-3.5" aria-hidden />
          Copiar
        </Button>
      </div>

      {displayMode === "virtual" ? (
        <VirtualTicketBadgeGrid
          ticketNumbers={ticketNumbers}
          listId={listId}
          ticketCount={ticketCount}
          className={cn(listScrollClassName, "max-h-[min(32vh,260px)]")}
        />
      ) : (
        <div
          id={listId}
          className={cn(listScrollClassName, expanded ? "max-h-[min(32vh,260px)]" : "max-h-[72px]")}
          role="list"
          aria-label={`Números de boletos asignados, ${ticketCount} en total`}
        >
          <div className="flex flex-wrap gap-1">
            {visibleTickets.map((ticket) => (
              <Badge
                key={ticket}
                variant="outline"
                className="h-6 px-1.5 font-mono text-[10px] tabular-nums"
                role="listitem"
              >
                {ticket}
              </Badge>
            ))}
            {hiddenTicketCount > 0 ? (
              <Badge variant="secondary" className="h-6 px-1.5 text-[10px] tabular-nums">
                +{hiddenTicketCount}
              </Badge>
            ) : null}
          </div>
        </div>
      )}

      {manyTickets ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-1.5 h-8 w-full text-xs"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={toggleExpanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-1 size-3.5" aria-hidden />
              Ocultar números
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 size-3.5" aria-hidden />
              Ver los {ticketCount} números
            </>
          )}
        </Button>
      ) : null}
    </div>
  )
}
