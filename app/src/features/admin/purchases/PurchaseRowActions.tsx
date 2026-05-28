import { CheckCircleIcon, EyeIcon, XCircleIcon } from "@phosphor-icons/react"
import { useState } from "react"
import type { PurchaseRow } from "@/features/admin/purchases/types"
import { Button } from "@/components/ui/button"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"

type PurchaseRowActionsProps = {
  purchase: PurchaseRow
  onView: () => void
  onStatusChange: (status: "approved" | "rejected") => void
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
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null)
  const buttonSize = density === "compact" ? "icon-xs" : "icon-sm"
  const buttonClassName = density === "compact" ? undefined : "size-11"

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
        {purchase.status === "pending" && (
          <>
            <Button
              size={buttonSize}
              variant="outline"
              className={buttonClassName}
              disabled={pending}
              onClick={() => setConfirm("approve")}
              title="Aprobar"
            >
              <CheckCircleIcon />
            </Button>
            <Button
              size={buttonSize}
              variant="outline"
              className={buttonClassName}
              disabled={pending}
              onClick={() => setConfirm("reject")}
              title="Rechazar"
            >
              <XCircleIcon />
            </Button>
          </>
        )}
      </div>

      <ConfirmAction
        open={confirm === "approve"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Aprobar compra"
        description={`¿Confirmas la compra #${purchase.id} de ${purchase.customer_name}? Se asignarán los boletos definitivamente.`}
        confirmLabel="Aprobar"
        pending={pending}
        onConfirm={() => {
          onStatusChange("approved")
          setConfirm(null)
        }}
      />

      <ConfirmAction
        open={confirm === "reject"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Rechazar compra"
        description={`¿Rechazar la compra #${purchase.id}? Los boletos quedarán liberados.`}
        confirmLabel="Rechazar"
        pending={pending}
        destructive
        onConfirm={() => {
          onStatusChange("rejected")
          setConfirm(null)
        }}
      />
    </>
  )
}
