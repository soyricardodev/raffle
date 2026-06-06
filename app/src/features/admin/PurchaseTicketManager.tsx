import { Minus, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAdminUserPreferences } from "@/features/admin/preferences/use-admin-user-preferences"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { requestPurchaseTicketAction } from "@/features/admin/purchases/purchase-action-guard"
import { useAdminPurchaseTicketAdjustments } from "@/features/admin/purchases/use-admin-purchase-ticket-adjustments"
import type { PurchaseDetail } from "@/features/admin/purchases/types"
import { cn } from "@/lib/utils"

type PurchaseTicketManagerProps = {
  purchase: PurchaseDetail
  stockLoaded: boolean
  onUpdated: (patch: Partial<PurchaseDetail>) => void
  embedded?: boolean
}

export function PurchaseTicketManager({
  purchase,
  stockLoaded,
  onUpdated,
  embedded = false,
}: PurchaseTicketManagerProps) {
  const { skipTicketAdjustConfirm } = useAdminUserPreferences()
  const {
    targetDraft,
    setTargetDraft,
    confirm,
    setConfirm,
    resolution,
    pending,
    canAdjust,
    canReassign,
    canSubmitUpdate,
    validationMessage,
    helpText,
    stockHint,
    updateConfirmDescription,
    commitDraft,
    stepTarget,
    isDecrease,
    adjustMutation,
    reassignMutation,
    currentQty,
    target,
  } = useAdminPurchaseTicketAdjustments({ purchase, stockLoaded, onUpdated })

  if (!canAdjust && !canReassign) return null

  const canStep =
    resolution != null && resolution.parsed != null && resolution.message == null

  function submitTicketUpdate() {
    const adjustDelta = target - currentQty
    if (adjustDelta === 0) {
      setConfirm(null)
      return
    }
    adjustMutation.mutate(adjustDelta)
  }

  return (
    <div
      className={cn(
        embedded ? "flex flex-col gap-2 border-t pt-2" : "space-y-2 rounded-lg border bg-muted/20 p-2",
      )}
    >
      {!embedded && (
        <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
          Gestionar boletos
        </p>
      )}

      {canReassign && (
        <div className="flex flex-col gap-1.5">
          <p className="text-muted-foreground text-[11px] leading-snug">
            Reasigna números y deja la compra pendiente.
          </p>
          <Button
            className="h-8 w-full"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() =>
              requestPurchaseTicketAction({
                skipConfirm: skipTicketAdjustConfirm,
                onAction: () => reassignMutation.mutate(),
                openConfirm: () => setConfirm("reassign"),
              })
            }
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Reasignar
          </Button>
        </div>
      )}

      {canAdjust && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-qty" className="text-[11px] text-muted-foreground">
            Cantidad
          </Label>
          {!stockLoaded ? (
            <p className="text-muted-foreground text-[10px] leading-snug">
              Cargando disponibilidad de la rifa…
            </p>
          ) : (
            <>
              {stockHint ? (
                <p className="text-muted-foreground text-[10px] leading-snug">{stockHint}</p>
              ) : null}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0"
                  disabled={
                    pending ||
                    !canStep ||
                    resolution.parsed == null ||
                    resolution.parsed <= resolution.bounds.min
                  }
                  onClick={() => stepTarget(-1)}
                  aria-label="Menos"
                >
                  <Minus className="size-3.5" />
                </Button>
                <Input
                  id="ticket-qty"
                  type="number"
                  inputMode="numeric"
                  min={resolution?.bounds.min}
                  max={resolution?.bounds.max}
                  value={targetDraft}
                  onChange={(e) => setTargetDraft(e.target.value)}
                  onBlur={commitDraft}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      commitDraft()
                    }
                  }}
                  className="h-8 text-center text-sm tabular-nums"
                  aria-invalid={validationMessage != null}
                  disabled={pending}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0"
                  disabled={
                    pending ||
                    !canStep ||
                    resolution.parsed == null ||
                    resolution.parsed >= resolution.bounds.max
                  }
                  onClick={() => stepTarget(1)}
                  aria-label="Más"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
              {validationMessage ? (
                <p className="text-destructive text-[10px] leading-snug">{validationMessage}</p>
              ) : (
                <p className="text-muted-foreground text-[10px]">{helpText}</p>
              )}
              <Button
                className="h-8 w-full"
                size="sm"
                disabled={pending || !canSubmitUpdate}
                onClick={() =>
                  requestPurchaseTicketAction({
                    skipConfirm: skipTicketAdjustConfirm,
                    onAction: submitTicketUpdate,
                    openConfirm: () => setConfirm("update"),
                  })
                }
              >
                Actualizar boletos
              </Button>
            </>
          )}
        </div>
      )}

      <ConfirmAction
        open={confirm === "update"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Actualizar boletos"
        description={updateConfirmDescription}
        confirmLabel="Actualizar"
        pending={pending}
        destructive={isDecrease}
        onConfirm={submitTicketUpdate}
      />

      <ConfirmAction
        open={confirm === "reassign"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Reasignar boletos"
        description="Se asignarán nuevos números disponibles y la compra quedará en pendiente."
        confirmLabel="Reasignar"
        pending={pending}
        onConfirm={() => reassignMutation.mutate()}
      />
    </div>
  )
}
