import { Minus, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  compactToolbar?: boolean
}

function TicketOperationControls({
  operationDraft,
  setOperationDraft,
  operationQuantity,
  canStep,
  canSubmitAdd,
  canSubmitRemove,
  pending,
  validationMessage,
  commitDraft,
  stepOperation,
  requestOperation,
}: {
  operationDraft: string
  setOperationDraft: (value: string) => void
  operationQuantity: number | null
  canStep: boolean
  canSubmitAdd: boolean
  canSubmitRemove: boolean
  pending: boolean
  validationMessage: string | null
  commitDraft: () => void
  stepOperation: (step: -1 | 1) => void
  requestOperation: (operation: "add" | "remove") => void
}) {
  const qtyDisplay = operationDraft.trim() !== "" ? operationDraft : "1"
  const numberSlotClassName =
    "inline-block w-10 shrink-0 overflow-hidden text-center tabular-nums"

  return (
    <div
      className="flex shrink-0 flex-nowrap items-center gap-1 rounded-lg border bg-muted/25 p-0.5"
      role="group"
      aria-label="Ajustar cantidad de boletos"
    >
      <Button
        type="button"
        className="h-7 w-[7rem] shrink-0 justify-between gap-0 border-destructive/40 bg-transparent px-2 text-xs text-destructive hover:bg-destructive/10"
        size="sm"
        variant="outline"
        disabled={pending || !canSubmitRemove}
        onClick={() => requestOperation("remove")}
      >
        <span className="shrink-0">Quitar</span>
        <span className={numberSlotClassName}>{qtyDisplay}</span>
      </Button>

      <div className="flex w-[7.5rem] shrink-0 items-center gap-0.5 rounded-md border bg-background px-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 shrink-0"
          disabled={pending || !canStep || operationQuantity == null || operationQuantity <= 1}
          onClick={() => stepOperation(-1)}
          aria-label="Reducir cantidad"
        >
          <Minus className="size-3.5" />
        </Button>
        <Input
          id="ticket-qty"
          type="number"
          inputMode="numeric"
          min={1}
          value={operationDraft}
          onChange={(e) => setOperationDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commitDraft()
            }
          }}
          className="h-7 w-12 min-w-12 max-w-12 shrink-0 border-0 bg-transparent px-0 text-center text-xs shadow-none tabular-nums focus-visible:ring-0 [-moz-appearance:textfield] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label="Cantidad de boletos a operar"
          aria-invalid={validationMessage != null}
          disabled={pending}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 shrink-0"
          disabled={pending || !canStep}
          onClick={() => stepOperation(1)}
          aria-label="Aumentar cantidad"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <Button
        type="button"
        className="h-7 w-[7rem] shrink-0 justify-between gap-0 px-2 text-xs"
        size="sm"
        disabled={pending || !canSubmitAdd}
        onClick={() => requestOperation("add")}
      >
        <span className="shrink-0">Agregar</span>
        <span className={numberSlotClassName}>{qtyDisplay}</span>
      </Button>
    </div>
  )
}

export function PurchaseTicketManager({
  purchase,
  stockLoaded,
  onUpdated,
  embedded = false,
  compactToolbar = false,
}: PurchaseTicketManagerProps) {
  const { skipTicketAdjustConfirm } = useAdminUserPreferences()
  const {
    operationDraft,
    setOperationDraft,
    confirm,
    setConfirm,
    resolution,
    pending,
    canAdjust,
    canReassign,
    canSubmitAdd,
    canSubmitRemove,
    validationMessage,
    confirmDescriptionFor,
    commitDraft,
    stepOperation,
    submitOperation,
    reassignMutation,
    operationQuantity,
  } = useAdminPurchaseTicketAdjustments({ purchase, stockLoaded, onUpdated })

  if (!canAdjust && !canReassign) return null

  const canStep =
    resolution != null && resolution.parsed != null && resolution.message == null

  function requestOperation(operation: "add" | "remove") {
    requestPurchaseTicketAction({
      skipConfirm: skipTicketAdjustConfirm,
      onAction: () => submitOperation(operation),
      openConfirm: () => setConfirm(operation),
    })
  }

  const adjustControls =
    canAdjust && stockLoaded ? (
      <TicketOperationControls
        operationDraft={operationDraft}
        setOperationDraft={setOperationDraft}
        operationQuantity={operationQuantity}
        canStep={canStep}
        canSubmitAdd={canSubmitAdd}
        canSubmitRemove={canSubmitRemove}
        pending={pending}
        validationMessage={validationMessage}
        commitDraft={commitDraft}
        stepOperation={stepOperation}
        requestOperation={requestOperation}
      />
    ) : canAdjust && !stockLoaded ? (
      <span className="text-muted-foreground shrink-0 text-[10px]">…</span>
    ) : null

  const reassignControl = canReassign ? (
    <Button
      className="h-7 shrink-0 px-2 text-xs"
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
      <RefreshCw className="mr-1 size-3" />
      Reasignar
    </Button>
  ) : null

  const confirmDialogs = (
    <>
      <ConfirmAction
        open={confirm === "add"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Agregar boletos"
        description={confirmDescriptionFor("add")}
        confirmLabel="Agregar"
        pending={pending}
        onConfirm={() => submitOperation("add")}
      />

      <ConfirmAction
        open={confirm === "remove"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Quitar boletos"
        description={confirmDescriptionFor("remove")}
        confirmLabel="Quitar"
        pending={pending}
        destructive
        onConfirm={() => submitOperation("remove")}
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
    </>
  )

  if (compactToolbar) {
    return (
      <div className="flex shrink-0 flex-col gap-0.5">
        <div className="flex shrink-0 flex-nowrap items-center gap-1">
          {adjustControls}
          {reassignControl}
        </div>
        {validationMessage ? (
          <p className="text-destructive text-[10px] leading-snug">{validationMessage}</p>
        ) : null}
        {confirmDialogs}
      </div>
    )
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
          {reassignControl}
        </div>
      )}

      {canAdjust && (
        <div className="flex flex-col gap-1.5">
          {!stockLoaded ? (
            <p className="text-muted-foreground text-[10px] leading-snug">
              Cargando detalle de la compra…
            </p>
          ) : (
            <>
              {adjustControls}
              {validationMessage ? (
                <p className="text-destructive text-[10px] leading-snug">{validationMessage}</p>
              ) : null}
            </>
          )}
        </div>
      )}

      {confirmDialogs}
    </div>
  )
}
