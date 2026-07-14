import {
  CheckCircleIcon,
  CopyIcon,
  XCircleIcon,
} from "@phosphor-icons/react"
import type { VerifiedTicketRow } from "@raffle/shared/validators"
import { useMemo } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  featuredTicketBadgeClassName,
  featuredTicketBadgeGridClassName,
  featuredTicketSectionClassName,
} from "@/features/tickets/ticket-badge-styles"
import { formatDate, getPurchaseStatusClass, getStatusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

function statusIcon(status: "approved" | "rejected") {
  switch (status) {
    case "approved":
      return CheckCircleIcon
    case "rejected":
      return XCircleIcon
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

function resolvedDisplayStatus(
  purchaseStatus: string | null | undefined,
): "approved" | "rejected" | null {
  if (purchaseStatus === "approved" || purchaseStatus === "rejected") {
    return purchaseStatus
  }
  return null
}

async function copyTicketNumber(ticketNumber: string) {
  try {
    await navigator.clipboard.writeText(ticketNumber)
    toast.success("Número copiado")
  } catch {
    toast.error("No se pudo copiar")
  }
}

type VerifiedTicketsListProps = {
  tickets: VerifiedTicketRow[]
}

export function VerifiedTicketsList({ tickets }: VerifiedTicketsListProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, VerifiedTicketRow[]>()
    for (const ticket of tickets) {
      const list = map.get(ticket.raffle_name) ?? []
      list.push(ticket)
      map.set(ticket.raffle_name, list)
    }
    return [...map.entries()]
  }, [tickets])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium">
        {tickets.length} boleto{tickets.length === 1 ? "" : "s"} en {grouped.length} rifa
        {grouped.length === 1 ? "" : "s"}
      </p>

      {grouped.map(([raffleName, raffleTickets]) => (
        <section key={raffleName} className={featuredTicketSectionClassName}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-base leading-snug font-semibold">{raffleName}</h3>
              {raffleTickets[0]?.draw_date && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Sorteo: {formatDate(raffleTickets[0].draw_date)}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {raffleTickets.length}
            </Badge>
          </div>

          <div className={cn(featuredTicketBadgeGridClassName, "max-h-[min(42vh,320px)]")}>
            <div className="flex flex-wrap gap-2">
              {raffleTickets.map((ticket) => {
                const displayStatus = resolvedDisplayStatus(ticket.purchase_status)
                const StatusIcon = displayStatus ? statusIcon(displayStatus) : null
                return (
                  <div
                    key={`${raffleName}-${ticket.ticket_number}`}
                    className="flex min-w-[4.5rem] flex-col items-center gap-1.5"
                  >
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={featuredTicketBadgeClassName}
                        role="listitem"
                      >
                        {ticket.ticket_number}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground size-7 shrink-0"
                        aria-label={`Copiar boleto ${ticket.ticket_number}`}
                        onClick={() => void copyTicketNumber(ticket.ticket_number)}
                      >
                        <CopyIcon className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                    {displayStatus && StatusIcon ? (
                      <span
                        className={cn(
                          "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          getPurchaseStatusClass(displayStatus),
                        )}
                      >
                        <StatusIcon className="size-3" weight="fill" aria-hidden />
                        {getStatusLabel(displayStatus)}
                      </span>
                    ) : null}
                    {ticket.customer_name ? (
                      <p className="text-muted-foreground max-w-full truncate text-center text-[10px]">
                        {ticket.customer_name}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
