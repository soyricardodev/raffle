import { CheckCircleIcon, EyeIcon, XCircleIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { RejectPurchaseDialog } from "@/features/admin/purchases/RejectPurchaseDialog"
import type { PurchaseRow } from "@/features/admin/purchases/types"

type PurchaseRowActionsProps = {
  purchase: PurchaseRow
  onView: () => void
  onStatusChange: (status: "approved" | "rejected", notes?: string) => void
  pending: boolean
  density?: "compact" | "comfortable"
}

export function PurchaseRowActions({
  purchase,
  onView,
  onStatusChange,
  pending,
  density = "comfortable",
}: PurchaseRowActionsProps) {
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const buttonSize = density === "compact" ? "icon-xs" : "icon-sm"
  const buttonClassName = density === "compact" ? undefined : "size-11"

  const canApprove = purchase.status === "pending"
  const canReject = purchase.status === "pending" || purchase.status === "approved"

  return (
    <>
      <div className="flex gap-1">
        <Button
          size={buttonSize}
          variant="outline"
          className={buttonClassName}
          onClick={onView}
          title="Ver detalle"
        >
          <EyeIcon />
        </Button>
        {canApprove && (
          <Button
            size={buttonSize}
            variant="outline"
            className={buttonClassName}
            disabled={pending}
            onClick={() => setConfirmApprove(true)}
            title="Aprobar"
          >
            <CheckCircleIcon />
          </Button>
        )}
        {canReject && (
          <Button
            size={buttonSize}
            variant="outline"
            className={buttonClassName}
            disabled={pending}
            onClick={() => setRejectOpen(true)}
            title="Rechazar"
          >
            <XCircleIcon />
          </Button>
        )}
      </div>

      <ConfirmAction
        open={confirmApprove}
        onOpenChange={(open) => !open && setConfirmApprove(false)}
        title="Aprobar compra"
        description={`¿Confirmas la compra #${purchase.id} de ${purchase.customer_name}? Se asignarán los boletos definitivamente.`}
        confirmLabel="Aprobar"
        pending={pending}
        onConfirm={() => {
          onStatusChange("approved")
          setConfirmApprove(false)
        }}
      />

      <RejectPurchaseDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        purchaseId={purchase.id}
        customerName={purchase.customer_name}
        pending={purchase.status === "pending"}
        isPending={pending}
        onConfirm={(notes) => {
          onStatusChange("rejected", notes)
          setRejectOpen(false)
        }}
      />
    </>
  )
}
