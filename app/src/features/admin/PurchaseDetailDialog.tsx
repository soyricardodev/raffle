import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { adminFetch } from "@/lib/admin-fetch"
import {
  formatCurrencyForMethod,
  formatDateTime,
  getPurchaseStatusClass,
  getStatusLabel,
} from "@/lib/format"
import { PurchaseTicketManager } from "@/features/admin/PurchaseTicketManager"
import { CheckCircle, XCircle } from "lucide-react"

export type PurchaseDetail = {
  id: number
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_ci?: string
  raffle_name: string
  ticket_quantity: number
  total_amount: number | string
  payment_method: string
  payment_reference?: string
  payment_proof_url?: string | null
  status: string
  created_at: string
  ticket_numbers?: string
}

type PurchaseDetailDialogProps = {
  purchase: PurchaseDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPurchaseUpdated?: (patch: Partial<PurchaseDetail>) => void
}

export function PurchaseDetailDialog({
  purchase,
  open,
  onOpenChange,
  onPurchaseUpdated,
}: PurchaseDetailDialogProps) {
  const queryClient = useQueryClient()
  const [confirmReject, setConfirmReject] = useState(false)

  const statusMutation = useMutation({
    mutationFn: async (status: "approved" | "rejected") => {
      if (!purchase) throw new Error("Sin compra")
      return adminFetch(`/api/admin/purchases/${purchase.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      })
    },
    onSuccess: (_data, status) => {
      toast.success(status === "approved" ? "Compra aprobada" : "Compra rechazada")
      void queryClient.invalidateQueries({ queryKey: ["admin"] })
      setConfirmReject(false)
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (!purchase) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setConfirmReject(false)
        onOpenChange(next)
      }}
    >
      <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Compra #{purchase.id}</DialogTitle>
          <DialogDescription className="sr-only">Detalle de la venta</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 overflow-y-auto px-6 py-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Estado</span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${getPurchaseStatusClass(purchase.status)}`}
            >
              {getStatusLabel(purchase.status)}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">Cliente</p>
              <p className="font-medium">{purchase.customer_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Teléfono</p>
              <p className="font-medium">{purchase.customer_phone}</p>
            </div>
            {purchase.customer_email && (
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{purchase.customer_email}</p>
              </div>
            )}
            {purchase.customer_ci && (
              <div>
                <p className="text-muted-foreground text-xs">Cédula</p>
                <p className="font-medium">{purchase.customer_ci}</p>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">Rifa</p>
              <p className="font-medium">{purchase.raffle_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Boletos</p>
              <p className="font-medium tabular-nums">{purchase.ticket_quantity}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Método</p>
              <p className="font-medium capitalize">{purchase.payment_method.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total</p>
              <p className="font-medium tabular-nums">
                {formatCurrencyForMethod(purchase.total_amount, purchase.payment_method)}
              </p>
            </div>
          </div>
          {purchase.payment_reference && (
            <div>
              <p className="text-muted-foreground text-xs">Referencia</p>
              <p className="font-medium">{purchase.payment_reference}</p>
            </div>
          )}
          {purchase.payment_proof_url && (
            <div>
              <p className="text-muted-foreground mb-1 text-xs">Comprobante</p>
              <a
                href={purchase.payment_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm underline focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                Ver comprobante
              </a>
            </div>
          )}
          {purchase.ticket_numbers && (
            <div className="bg-muted rounded-xl p-3">
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">Boletos</p>
              <p className="font-mono text-xs leading-relaxed">{purchase.ticket_numbers}</p>
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Registrada: {formatDateTime(purchase.created_at)}
          </p>
          <PurchaseTicketManager
            purchase={purchase}
            onUpdated={(patch) => onPurchaseUpdated?.(patch)}
          />
        </div>
        {purchase.status === "pending" && (
          <DialogFooter className="shrink-0 flex-col gap-2 border-t px-6 py-4 sm:flex-row">
            {confirmReject ? (
              <>
                <p className="text-muted-foreground w-full text-center text-xs sm:text-left">
                  ¿Rechazar esta compra? Los boletos quedarán liberados.
                </p>
                <Button
                  variant="outline"
                  className="min-h-11 w-full sm:w-auto"
                  disabled={statusMutation.isPending}
                  onClick={() => setConfirmReject(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="min-h-11 w-full sm:w-auto"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate("rejected")}
                >
                  Sí, rechazar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="min-h-11 w-full sm:w-auto"
                  disabled={statusMutation.isPending}
                  onClick={() => setConfirmReject(true)}
                >
                  <XCircle className="mr-2 size-4" />
                  Rechazar
                </Button>
                <Button
                  className="min-h-11 w-full sm:w-auto"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate("approved")}
                >
                  <CheckCircle className="mr-2 size-4" />
                  Aprobar
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
