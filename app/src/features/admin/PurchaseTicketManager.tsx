import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrencyForMethod } from "@/lib/format"
import { Minus, Plus, RefreshCw } from "lucide-react"
import type { PurchaseDetail } from "@/features/admin/PurchaseDetailDialog"

type TicketAddResult = {
  addedTickets: string[]
  newQuantity: number
  newTotalAmount: number
}

type TicketRemoveResult = {
  removedTickets: string[]
  newQuantity: number
  newTotalAmount: number
}

type TicketReassignResult = {
  ticketNumbers: string[]
  newQuantity: number
  newTotalAmount: number
}

type PurchaseApi = {
  status: string
  ticket_quantity: number
  total_amount: number | string
  ticketNumbers: string[]
}

type PurchaseTicketManagerProps = {
  purchase: PurchaseDetail
  onUpdated: (patch: Partial<PurchaseDetail>) => void
}

async function refetchPurchaseDetail(id: number): Promise<Partial<PurchaseDetail>> {
  const data = await adminFetch<PurchaseApi>(`/api/admin/purchases/${id}`)
  return {
    status: data.status,
    ticket_quantity: data.ticket_quantity,
    total_amount: data.total_amount,
    ticket_numbers: data.ticketNumbers.join(", "),
  }
}

export function PurchaseTicketManager({ purchase, onUpdated }: PurchaseTicketManagerProps) {
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = useState(1)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [confirmReassign, setConfirmReassign] = useState(false)

  const qty = Math.max(1, Math.min(quantity, 500))

  const syncAfterChange = async (message: string) => {
    toast.success(message)
    const patch = await refetchPurchaseDetail(purchase.id)
    onUpdated(patch)
    void queryClient.invalidateQueries({ queryKey: ["admin"] })
    setConfirmRemove(false)
    setConfirmReassign(false)
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
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <p className="text-sm font-semibold">Gestionar boletos</p>

      {canReassign && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Asigna nuevos números disponibles y deja la compra en pendiente.
          </p>
          {confirmReassign ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="min-h-11 flex-1"
                disabled={pending}
                onClick={() => setConfirmReassign(false)}
              >
                Cancelar
              </Button>
              <Button
                className="min-h-11 flex-1"
                disabled={pending}
                onClick={() => reassignMutation.mutate()}
              >
                Confirmar reasignación
              </Button>
            </div>
          ) : (
            <Button
              className="min-h-11 w-full"
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirmReassign(true)}
            >
              <RefreshCw className="mr-2 size-4" />
              Reasignar boletos
            </Button>
          )}
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
                max={canAdjust ? maxRemove : 500}
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
            <Button className="min-h-11" disabled={pending} onClick={() => addMutation.mutate()}>
              Agregar
            </Button>
            {confirmRemove ? (
              <>
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={pending}
                  onClick={() => setConfirmRemove(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="col-span-2 min-h-11"
                  disabled={pending || qty >= purchase.ticket_quantity}
                  onClick={() => removeMutation.mutate()}
                >
                  Confirmar: quitar {qty} boleto(s)
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="min-h-11"
                disabled={pending || qty >= purchase.ticket_quantity}
                onClick={() => setConfirmRemove(true)}
              >
                Quitar
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
