import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import {
  formatAccountInfoForDisplay,
  paymentMethodDisplayLabel,
} from "@raffle/shared/payment-methods"
import { isDollarMethod } from "@raffle/shared/validators"
import type { RafflePaymentMethod } from "@/features/raffle/types"
import { CopyIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

function CopyableRow({ label, value }: { label: string; value: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copiado")
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="min-w-0">
        <p className="text-muted-foreground text-[10px]">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Copiar ${label}`}
        onClick={() => void copy()}
      >
        <CopyIcon />
      </Button>
    </div>
  )
}

type PaymentDetailsPanelProps = {
  method: RafflePaymentMethod
  total: number
  quantity: number
}

export function PaymentDetailsPanel({ method, total, quantity }: PaymentDetailsPanelProps) {
  const lines = formatAccountInfoForDisplay(method.method_type, method.account_info)
  const currency = isDollarMethod(method.method_type) ? "USD" : "Bs"
  const displayName = paymentMethodDisplayLabel(method)

  async function copyAll() {
    const text = [
      displayName,
      ...lines.map((l) => `${l.label}: ${l.value}`),
      formatCurrency(total, currency),
    ].join("\n")
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copiado")
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{displayName}</p>
        <Button type="button" variant="outline" size="xs" onClick={() => void copyAll()}>
          <CopyIcon data-icon="inline-start" />
          Copiar
        </Button>
      </div>

      <div className="divide-border divide-y">
        {lines.map((line, index) => (
          <CopyableRow key={`${method.id}-${index}`} label={line.label} value={line.value} />
        ))}
      </div>

      <div className="mt-2 flex items-baseline justify-between border-t pt-2">
        <span className="text-muted-foreground text-xs">
          {quantity} boleto{quantity === 1 ? "" : "s"}
        </span>
        <span className="text-lg font-bold tabular-nums">{formatCurrency(total, currency)}</span>
      </div>
    </div>
  )
}
