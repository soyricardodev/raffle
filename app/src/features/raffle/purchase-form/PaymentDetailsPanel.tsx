import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/format"
import {
  formatAccountInfoForDisplay,
  PAYMENT_METHOD_DEFINITIONS,
  paymentMethodTypeLabel,
} from "@raffle/shared/payment-methods"
import { isDollarMethod } from "@raffle/shared/validators"
import type { RafflePaymentMethod } from "@/features/raffle/types"
import { Copy } from "lucide-react"
import { toast } from "sonner"

function CopyableDetailRow({ label, value }: { label: string; value: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copiado")
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-foreground break-all font-medium">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 shrink-0"
        aria-label={`Copiar ${label}`}
        onClick={() => void copy()}
      >
        <Copy className="size-4" />
      </Button>
    </div>
  )
}

type PaymentDetailsPanelProps = {
  method: RafflePaymentMethod
  total: number
}

export function PaymentDetailsPanel({ method, total }: PaymentDetailsPanelProps) {
  const lines = formatAccountInfoForDisplay(method.method_type, method.account_info)
  const currency = isDollarMethod(method.method_type) ? "USD" : "Bs"
  const def = PAYMENT_METHOD_DEFINITIONS[method.method_type]
  const hint = def?.fields.find((f) => f.hint)?.hint

  return (
    <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">Datos para pagar</p>
        <Badge variant="secondary">{paymentMethodTypeLabel(method.method_type)}</Badge>
        <Badge variant="outline">{currency}</Badge>
      </div>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      <div className="divide-border divide-y rounded-lg border bg-background/80 px-3">
        {lines.map((line, index) => (
          <CopyableDetailRow
            key={`${method.id}-line-${index}`}
            label={line.label}
            value={line.value}
          />
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-primary/15 pt-3">
        <span className="text-muted-foreground text-sm">Total a pagar</span>
        <span className="text-xl font-bold tabular-nums">{formatCurrency(total, currency)}</span>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Realiza la transferencia y luego ingresa la referencia abajo. Revisaremos tu pago para
        confirmar los boletos.
      </p>
    </div>
  )
}
