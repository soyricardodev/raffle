import { CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PurchaseDrawerActionsProps = {
  status: string
  disabled?: boolean
  onApprove?: () => void
  onReject: () => void
  className?: string
}

export function PurchaseDrawerActions({
  status,
  disabled = false,
  onApprove,
  onReject,
  className,
}: PurchaseDrawerActionsProps) {
  const isPending = status === "pending"
  const isApproved = status === "approved"

  if (!isPending && !isApproved) return null

  if (isApproved) {
    return (
      <div className={cn("p-3", className)}>
        <Button
          variant="outline"
          className="h-9 w-full text-destructive hover:text-destructive"
          disabled={disabled}
          onClick={onReject}
        >
          <XCircle data-icon="inline-start" />
          Rechazar compra
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex gap-2 p-3", className)}>
      <Button variant="outline" className="h-9 flex-1" disabled={disabled} onClick={onReject}>
        <XCircle data-icon="inline-start" />
        Rechazar
      </Button>
      <Button className="h-9 flex-1" disabled={disabled} onClick={onApprove}>
        <CheckCircle data-icon="inline-start" />
        Aprobar
      </Button>
    </div>
  )
}
