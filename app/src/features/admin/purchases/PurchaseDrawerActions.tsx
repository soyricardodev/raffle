import { CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PurchaseDrawerActionsProps = {
  pending: boolean
  disabled?: boolean
  onApprove: () => void
  onReject: () => void
  className?: string
}

export function PurchaseDrawerActions({
  pending,
  disabled = false,
  onApprove,
  onReject,
  className,
}: PurchaseDrawerActionsProps) {
  if (!pending) return null

  return (
    <div className={cn("flex gap-2 p-4", className)}>
      <Button variant="outline" className="min-h-11 flex-1" disabled={disabled} onClick={onReject}>
        <XCircle className="mr-2 size-4" />
        Rechazar
      </Button>
      <Button className="min-h-11 flex-1" disabled={disabled} onClick={onApprove}>
        <CheckCircle className="mr-2 size-4" />
        Aprobar
      </Button>
    </div>
  )
}
