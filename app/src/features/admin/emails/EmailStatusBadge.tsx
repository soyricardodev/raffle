import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

function statusClass(status: string) {
  switch (status) {
    case "sent":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
    case "failed":
    case "error":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
    default:
      return "bg-muted text-muted-foreground"
  }
}

const STATUS_LABELS: Record<string, string> = {
  sent: "Enviado",
  failed: "Fallido",
  error: "Error",
  pending: "Pendiente",
}

type EmailStatusBadgeProps = {
  status: string
  className?: string
}

export function EmailStatusBadge({ status, className }: EmailStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn("rounded-full font-medium capitalize", statusClass(status), className)}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
