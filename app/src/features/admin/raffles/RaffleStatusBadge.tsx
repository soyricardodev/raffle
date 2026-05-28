import { Badge } from "@/components/ui/badge"
import { getRaffleStatusClass, getStatusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

type RaffleStatusBadgeProps = {
  status: string
  className?: string
}

export function RaffleStatusBadge({ status, className }: RaffleStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn("rounded-full font-medium", getRaffleStatusClass(status), className)}
    >
      {getStatusLabel(status)}
    </Badge>
  )
}
