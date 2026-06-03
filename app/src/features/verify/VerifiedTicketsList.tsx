import { CheckCircleIcon, ClockIcon, CopyIcon, TicketIcon, XCircleIcon } from "@phosphor-icons/react"
import { useMemo } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, getPurchaseStatusClass, getStatusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { VerifiedTicketRow } from "@raffle/shared/validators"

function statusIcon(status: string) {
  switch (status) {
    case "approved":
      return CheckCircleIcon
    case "rejected":
      return XCircleIcon
    default:
      return ClockIcon
  }
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
    <div className="space-y-4">
      <p className="text-sm font-medium">
        {tickets.length} boleto{tickets.length === 1 ? "" : "s"} en {grouped.length} rifa
        {grouped.length === 1 ? "" : "s"}
      </p>

      {grouped.map(([raffleName, raffleTickets]) => (
        <section key={raffleName} className="space-y-2">
          <div className="flex items-start justify-between gap-2 px-0.5">
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

          <ul className="space-y-2">
            {raffleTickets.map((ticket) => {
              const purchaseStatus = ticket.purchase_status ?? "pending"
              const StatusIcon = statusIcon(purchaseStatus)
              return (
                <li key={`${raffleName}-${ticket.ticket_number}`}>
                  <Card className="border-border/80 py-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 px-4 py-3">
                      <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                        <TicketIcon className="size-5" weight="duotone" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="font-mono tabular-nums">#{ticket.ticket_number}</span>
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
                        </CardTitle>
                        {ticket.customer_name && (
                          <p className="text-muted-foreground mt-0.5 truncate text-xs">
                            {ticket.customer_name}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                          getPurchaseStatusClass(purchaseStatus),
                        )}
                      >
                        <StatusIcon className="size-3.5" weight="fill" aria-hidden />
                        {getStatusLabel(purchaseStatus)}
                      </span>
                    </CardHeader>
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
