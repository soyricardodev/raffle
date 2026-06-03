import { CopyIcon } from "@phosphor-icons/react"
import {
  formatAccountInfoForDisplay,
  paymentMethodDisplayLabel,
} from "@raffle/shared/payment-methods"
import { isDollarMethod } from "@raffle/shared/validators"
import { memo, useCallback, useMemo } from "react"
import { toast } from "sonner"
import type { RafflePaymentMethod } from "@/features/raffle/types"
import { Button } from "@/components/ui/button"
import { paymentDetailsPanelClassName } from "@/features/raffle/purchase-form/field-styles"
import { formatCurrency } from "@/lib/format"

function formatPaymentDetailForClipboard(value: string) {
  const trimmed = value.trim()
  if (/^[vje]-?\s*[\d.\s]+$/i.test(trimmed)) {
    return trimmed.replace(/\D/g, "")
  }
  return value
}

const CopyableRow = memo(function CopyablePaymentDetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(formatPaymentDetailForClipboard(value))
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
        className="text-emerald-700 hover:bg-emerald-500/15 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
        aria-label={`Copiar ${label}`}
        onClick={() => void copy()}
      >
        <CopyIcon />
      </Button>
    </div>
  )
})

type PaymentDetailsPanelProps = {
  method: RafflePaymentMethod
  total: number
  quantity: number
}

export const PaymentDetailsPanel = memo(function PaymentDetailsPanelInner({
  method,
  total,
  quantity,
}: PaymentDetailsPanelProps) {
  const lines = useMemo(
    () => formatAccountInfoForDisplay(method.method_type, method.account_info),
    [method.account_info, method.method_type],
  )
  const currency = useMemo(
    () => (isDollarMethod(method.method_type) ? "USD" : "Bs"),
    [method.method_type],
  )
  const displayName = useMemo(() => paymentMethodDisplayLabel(method), [method])

  const copyAll = useCallback(async () => {
    const text = [
      displayName,
      ...lines.map((l) => `${l.label}: ${formatPaymentDetailForClipboard(l.value)}`),
      formatCurrency(total, currency),
    ].join("\n")
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copiado")
    } catch {
      toast.error("No se pudo copiar")
    }
  }, [currency, displayName, lines, total])

  return (
    <div className={paymentDetailsPanelClassName}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-300">
            Datos para transferir
          </p>
          <p className="truncate text-base font-bold">{displayName}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-900 hover:bg-emerald-500/20 dark:text-emerald-50"
          onClick={() => void copyAll()}
        >
          <CopyIcon data-icon="inline-start" />
          Copiar
        </Button>
      </div>

      <div className="divide-border overflow-hidden rounded-xl border border-emerald-500/20 bg-background/70 px-3">
        {lines.map((line) => (
          <CopyableRow
            key={`${method.id}-${line.label}-${line.value}`}
            label={line.label}
            value={line.value}
          />
        ))}
      </div>

      <div className="mt-3 flex items-baseline justify-between rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/20 to-teal-500/15 px-3 py-2.5">
        <span className="text-muted-foreground text-xs">
          {quantity} boleto{quantity === 1 ? "" : "s"}
        </span>
        <span className="text-xl font-extrabold text-emerald-950 tabular-nums dark:text-emerald-50">
          {formatCurrency(total, currency)}
        </span>
      </div>
    </div>
  )
})
