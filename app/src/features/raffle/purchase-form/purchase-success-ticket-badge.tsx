import { Badge } from "@/components/ui/badge"
import { featuredTicketBadgeClassName } from "@/features/tickets/ticket-badge-styles"

type PurchaseSuccessTicketBadgeProps = {
  ticket: string
}

export function PurchaseSuccessTicketBadge({ ticket }: PurchaseSuccessTicketBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={featuredTicketBadgeClassName}
      role="listitem"
    >
      {ticket}
    </Badge>
  )
}
