import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Minus, Plus, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import type { PurchaseDetail } from "@/features/admin/purchases/types"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrencyForMethod } from "@/lib/format"

type TicketAddResult = {
  addedTickets: Array<string>
  newQuantity: number
  newTotalAmount: number
}

type TicketRemoveResult = {
  removedTickets: Array<string>
  newQuantity: number
  newTotalAmount: number
}

type TicketReassignResult = {
  ticketNumbers: Array<string>
  newQuantity: number
  newTotalAmount: number
}

type PurchaseApi = {
  status: string
  ticket_quantity: number
  total_amount: number | string
  ticketNumbers: Array<string>
}

type PurchaseTicketManagerProps = {
  purchase: PurchaseDetail
  onUpdated: (patch: Partial<PurchaseDetail>) => void
}

type ConfirmKind = "update" | "reassign" | null

const MAX_TARGET_QTY = 500

function clampTargetQty(value: number): number {
  return Math.max(1, Math.min(value, MAX_TARGET_QTY))
}

async function refetchPurchaseDetail(id: number): Promise<Partial<PurchaseDetail>> {
  const data = await adminFetch<PurchaseApi>(`/api/admin/purchases/${id}`)
  return {
    status: data.status,
    ticket_quantity: data.ticket_quantity,
    total_amount: data.total_amount,
    ticket_numbers: data.ticketNumbers.join(", "),
    ticketNumbers: data.ticketNumbers,
  }
}

export function PurchaseTicketManager({ purchase, onUpdated }: PurchaseTicketManagerProps) {
  const queryClient = useQueryClient()
  const [targetQty, setTargetQty] = useState(purchase.ticket_quantity)
  const [confirm, setConfirm] = useState<ConfirmKind>(null)

  const currentQty = purchase.ticket_quantity

  useEffect(() => {
    setTargetQty(currentQty)
  }, [purchase.id, currentQty])

  const clampedTarget = clampTargetQty(targetQty)
  const delta = clampedTarget - currentQty
  const hasChange = delta !== 0
  const isDecrease = delta < 0

  useEffect(() => {
    if (confirm === "update" && !hasChange) {
      setConfirm(null)
    }
  }, [confirm, hasChange])

  const formattedCurrentTotal = formatCurrencyForMethod(
    purchase.total_amount,
    purchase.payment_method,
  )

  const totalAmount = Number(purchase.total_amount)
  const unitPrice =
    currentQty > 0 && Number.isFinite(totalAmount) ? totalAmount / currentQty : null

  const estimatedTotal =
    unitPrice != null && hasChange
      ? formatCurrencyForMethod(unitPrice * clampedTarget, purchase.payment_method)
      : null

  const syncAfterChange = async (message: string) => {
    toast.success(message)
    const patch = await refetchPurchaseDetail(purchase.id)
    onUpdated(patch)
    void queryClient.invalidateQueries({ queryKey: ["admin"] })
    setConfirm(null)
  }

  const adjustMutation = useMutation({
    mutationFn: async (adjustDelta: number) => {
      if (adjustDelta === 0) {
        throw new Error("Sin cambios en la cantidad de boletos")
      }
      const absDelta = Math.abs(adjustDelta)
      if (adjustDelta > 0) {
        const result = await adminFetch<TicketAddResult>(
          `/api/admin/purchases/${purchase.id}/tickets/add`,
          {
            method: "PUT",
            body: JSON.stringify({ quantity: absDelta }),
          },
        )
        return { kind: "add" as const, result }
      }
      const result = await adminFetch<TicketRemoveResult>(
        `/api/admin/purchases/${purchase.id}/tickets/remove`,
        {
          method: "PUT",
          body: JSON.stringify({ quantity: absDelta }),
        },
      )
      return { kind: "remove" as const, result }
    },
    onSuccess: async (data) => {
      const message =
        data.kind === "add"
          ? `${data.result.addedTickets.length} boleto(s) agregado(s)`
          : `${data.result.removedTickets.length} boleto(s) eliminado(s)`
      await syncAfterChange(message)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const reassignMutation = useMutation({
    mutationFn: () =>
      adminFetch<TicketReassignResult>(`/api/admin/purchases/${purchase.id}/tickets/reassign`, {
        method: "PUT",
      }),
    onSuccess: async () => {
      await syncAfterChange("Boletos reasignados — compra pendiente")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const pending = adjustMutation.isPending || reassignMutation.isPending
  const canAdjust = purchase.status === "approved" || purchase.status === "pending"
  const canReassign = purchase.status === "rejected"

  const deltaLabel = delta > 0 ? `+${delta}` : String(delta)

  const helpText = hasChange
    ? `${deltaLabel} boleto(s) · Total aprox. ${estimatedTotal ?? formattedCurrentTotal} (se confirma al guardar)`
    : `Sin cambios · Total ${formattedCurrentTotal}`

  const updateConfirmDescription =
    estimatedTotal != null
      ? `Cambiar de ${currentQty} a ${clampedTarget} boleto(s) (${deltaLabel}). Total aprox.: ${estimatedTotal}. El monto final lo calcula el sistema al guardar.`
      : `Cambiar de ${currentQty} a ${clampedTarget} boleto(s) (${deltaLabel}). El total se recalculará al guardar.`

  if (!canAdjust && !canReassign) return null

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-semibold tracking-wide uppercase">Gestionar boletos</p>

      {canReassign && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Asigna nuevos números disponibles y deja la compra en pendiente.
          </p>
          <Button
            className="min-h-11 w-full"
            variant="secondary"
            disabled={pending}
            onClick={() => setConfirm("reassign")}
          >
            <RefreshCw className="mr-2 size-4" />
            Reasignar boletos
          </Button>
        </div>
      )}

      {canAdjust && (
        <>
          <div className="space-y-2">
            <Label htmlFor="ticket-qty" className="text-xs">
              Boletos en la compra
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                disabled={pending || clampedTarget <= 1}
                onClick={() => setTargetQty((n) => clampTargetQty(n - 1))}
                aria-label="Menos"
              >
                <Minus className="size-4" />
              </Button>
              <Input
                id="ticket-qty"
                type="number"
                min={1}
                value={clampedTarget}
                onChange={(e) => {
                  const parsed = Number(e.target.value)
                  setTargetQty(
                    Number.isFinite(parsed) && parsed >= 1 ? clampTargetQty(parsed) : 1,
                  )
                }}
                className="min-h-11 text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                disabled={pending || clampedTarget >= MAX_TARGET_QTY}
                onClick={() => setTargetQty((n) => clampTargetQty(n + 1))}
                aria-label="Más"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">{helpText}</p>
          </div>
          <Button
            className="min-h-11 w-full"
            disabled={pending || !hasChange}
            onClick={() => setConfirm("update")}
          >
            Actualizar boletos
          </Button>
        </>
      )}

      <ConfirmAction
        open={confirm === "update"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Actualizar boletos"
        description={updateConfirmDescription}
        confirmLabel="Actualizar"
        pending={pending}
        destructive={isDecrease}
        onConfirm={() => {
          const adjustDelta = clampTargetQty(targetQty) - purchase.ticket_quantity
          if (adjustDelta === 0) {
            setConfirm(null)
            return
          }
          adjustMutation.mutate(adjustDelta)
        }}
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
