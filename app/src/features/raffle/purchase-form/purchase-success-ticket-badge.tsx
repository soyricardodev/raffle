import { Badge } from "@/components/ui/badge"
import { purchaseSuccessTicketBadgeClassName } from "@/features/raffle/purchase-form/field-styles"

export function getPurchaseSuccessTicketBadgeClassName(_ticket?: string): string {
  return purchaseSuccessTicketBadgeClassName
}

type PurchaseSuccessTicketBadgeProps = {
  ticket: string
}

export function PurchaseSuccessTicketBadge({ ticket }: PurchaseSuccessTicketBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={purchaseSuccessTicketBadgeClassName}
      role="listitem"
    >
      {ticket}
    </Badge>
  )
}
