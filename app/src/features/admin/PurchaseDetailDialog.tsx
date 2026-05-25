import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency, formatDateTime, getPurchaseStatusClass, getStatusLabel } from "@/lib/format"

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
  status: string
  created_at: string
  ticket_numbers?: string
}

type PurchaseDetailDialogProps = {
  purchase: PurchaseDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PurchaseDetailDialog({ purchase, open, onOpenChange }: PurchaseDetailDialogProps) {
  if (!purchase) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compra #{purchase.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estado</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPurchaseStatusClass(purchase.status)}`}
            >
              {getStatusLabel(purchase.status)}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium">{purchase.customer_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Teléfono</p>
              <p className="font-medium">{purchase.customer_phone}</p>
            </div>
            {purchase.customer_email && (
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{purchase.customer_email}</p>
              </div>
            )}
            {purchase.customer_ci && (
              <div>
                <p className="text-muted-foreground">Cédula</p>
                <p className="font-medium">{purchase.customer_ci}</p>
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Rifa</p>
              <p className="font-medium">{purchase.raffle_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Boletos</p>
              <p className="font-medium">{purchase.ticket_quantity}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Método</p>
              <p className="font-medium uppercase">{purchase.payment_method.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium">{formatCurrency(purchase.total_amount)}</p>
            </div>
          </div>
          {purchase.payment_reference && (
            <div>
              <p className="text-muted-foreground">Referencia</p>
              <p className="font-medium">{purchase.payment_reference}</p>
            </div>
          )}
          {purchase.ticket_numbers && (
            <div className="bg-muted rounded-xl p-3">
              <p className="text-muted-foreground mb-1 text-xs uppercase">Boletos</p>
              <p className="font-mono text-xs leading-relaxed">{purchase.ticket_numbers}</p>
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Registrada: {formatDateTime(purchase.created_at)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
