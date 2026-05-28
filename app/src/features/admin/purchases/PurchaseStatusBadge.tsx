import { Badge } from "@/components/ui/badge"
import { getPurchaseStatusClass, getStatusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

type PurchaseStatusBadgeProps = {
  status: string
  className?: string
}

export function PurchaseStatusBadge({ status, className }: PurchaseStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn("rounded-full font-medium", getPurchaseStatusClass(status), className)}
    >
      {getStatusLabel(status)}
    </Badge>
  )
}
