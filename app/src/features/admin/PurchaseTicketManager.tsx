import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Minus, Plus, RefreshCw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import type { PurchaseDetail } from "@/features/admin/purchases/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
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

type ConfirmKind = "add" | "remove" | "reassign" | null

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
  const [quantity, setQuantity] = useState(1)
  const [confirm, setConfirm] = useState<ConfirmKind>(null)

  const qty = Math.max(1, Math.min(quantity, 500))

  const syncAfterChange = async (message: string) => {
    toast.success(message)
    const patch = await refetchPurchaseDetail(purchase.id)
    onUpdated(patch)
    void queryClient.invalidateQueries({ queryKey: ["admin"] })
    setConfirm(null)
  }

  const addMutation = useMutation({
    mutationFn: () =>
      adminFetch<TicketAddResult>(`/api/admin/purchases/${purchase.id}/tickets/add`, {
        method: "PUT",
        body: JSON.stringify({ quantity: qty }),
      }),
    onSuccess: async (result) => {
      await syncAfterChange(`${result.addedTickets.length} boleto(s) agregado(s)`)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const removeMutation = useMutation({
    mutationFn: () =>
      adminFetch<TicketRemoveResult>(`/api/admin/purchases/${purchase.id}/tickets/remove`, {
        method: "PUT",
        body: JSON.stringify({ quantity: qty }),
      }),
    onSuccess: async (result) => {
      await syncAfterChange(`${result.removedTickets.length} boleto(s) eliminado(s)`)
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

  const pending = addMutation.isPending || removeMutation.isPending || reassignMutation.isPending
  const canAdjust = purchase.status === "approved" || purchase.status === "pending"
  const canReassign = purchase.status === "rejected"
  const maxRemove = Math.max(1, purchase.ticket_quantity - 1)

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
              Cantidad a agregar o quitar
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                disabled={pending || qty <= 1}
                onClick={() => setQuantity((n) => Math.max(1, n - 1))}
                aria-label="Menos"
              >
                <Minus className="size-4" />
              </Button>
              <Input
                id="ticket-qty"
                type="number"
                min={1}
                max={maxRemove}
                value={qty}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                className="min-h-11 text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                disabled={pending}
                onClick={() => setQuantity((n) => n + 1)}
                aria-label="Más"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Actual: {purchase.ticket_quantity} ·{" "}
              {formatCurrencyForMethod(purchase.total_amount, purchase.payment_method)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="min-h-11"
              disabled={pending}
              onClick={() => setConfirm("add")}
            >
              Agregar
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={pending || qty >= purchase.ticket_quantity}
              onClick={() => setConfirm("remove")}
            >
              Quitar
            </Button>
          </div>
        </>
      )}

      <ConfirmAction
        open={confirm === "add"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Agregar boletos"
        description={`¿Agregar ${qty} boleto(s) a la compra #${purchase.id}? El total se actualizará.`}
        confirmLabel="Agregar"
        pending={pending}
        onConfirm={() => addMutation.mutate()}
      />

      <ConfirmAction
        open={confirm === "remove"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Quitar boletos"
        description={`¿Quitar ${qty} boleto(s) de la compra #${purchase.id}?`}
        confirmLabel="Quitar"
        pending={pending}
        destructive
        onConfirm={() => removeMutation.mutate()}
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
