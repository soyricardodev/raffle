import { CopyIcon } from "@phosphor-icons/react"
import {
  formatAccountInfoForDisplay,
  paymentMethodCurrencyLabel,
  paymentMethodDisplayLabel,
} from "@raffle/shared/payment-methods"
import { memo, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { RafflePaymentMethod } from "@/features/raffle/types"
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
  copyValue,
}: {
  label: string
  value: string
  copyValue?: string
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(copyValue ?? formatPaymentDetailForClipboard(value))
      toast.success("Copiado")
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="min-w-0">
        <p className="text-[10px] text-white/70">{label}</p>
        <p className="truncate text-sm font-medium text-white">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="text-white hover:bg-white/15 hover:text-white"
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
  const currency = paymentMethodCurrencyLabel(method.method_type)
  const displayName = useMemo(() => paymentMethodDisplayLabel(method), [method])
  const amountLabel = formatCurrency(total, currency)
  const amountCopyValue = Number.isFinite(total) ? total.toFixed(2) : amountLabel

  const copyAll = useCallback(async () => {
    const text = [
      displayName,
      `Monto: ${amountLabel}`,
      ...lines.map((l) => `${l.label}: ${formatPaymentDetailForClipboard(l.value)}`),
      `${quantity} boleto${quantity === 1 ? "" : "s"}`,
    ].join("\n")
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copiado")
    } catch {
      toast.error("No se pudo copiar")
    }
  }, [amountLabel, displayName, lines, quantity])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold tracking-wide text-white/80 uppercase">
          Datos para transferir
        </p>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          onClick={() => void copyAll()}
        >
          <CopyIcon data-icon="inline-start" />
          Copiar
        </Button>
      </div>

      <div className="divide-white/15 overflow-hidden rounded-xl border border-white/20 bg-black/20 px-3">
        <CopyableRow label="Monto" value={amountLabel} copyValue={amountCopyValue} />
        {lines.map((line) => (
          <CopyableRow
            key={`${method.id}-${line.label}-${line.value}`}
            label={line.label}
            value={line.value}
          />
        ))}
      </div>
    </div>
  )
})
