import { Badge } from "@/components/ui/badge"
import {
  formatAccountInfoForDisplay,
  paymentMethodCurrencyLabel,
  paymentMethodDisplayLabel,
  paymentMethodTypeLabel,
  PAYMENT_METHOD_DEFINITIONS,
} from "@raffle/shared/payment-methods"
import type { PaymentMethod } from "@raffle/shared/validators"
import type { RafflePaymentMethod } from "@/features/raffle/types"

type PaymentMethodSummaryProps = {
  method: Pick<
    RafflePaymentMethod,
    "id" | "label" | "method_type" | "account_info" | "min_tickets" | "is_active"
  >
  variant?: "admin" | "inline"
}

export function PaymentMethodSummary({
  method,
  variant = "inline",
}: PaymentMethodSummaryProps) {
  const type = method.method_type as PaymentMethod
  const lines = formatAccountInfoForDisplay(type, method.account_info)
  const def = PAYMENT_METHOD_DEFINITIONS[type]
  const title = paymentMethodDisplayLabel(method)
  const typeLabel = paymentMethodTypeLabel(type)
  const currency = paymentMethodCurrencyLabel(type)

  if (variant === "admin") {
    return (
      <div className="rounded-lg border p-3 text-sm">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-medium">{title}</span>
          <Badge variant="outline">{currency}</Badge>
          {method.min_tickets != null && method.min_tickets > 0 ? (
            <Badge variant="secondary">Mín. {method.min_tickets} boletos</Badge>
          ) : null}
          {method.is_active === false ? <Badge variant="outline">Inactivo</Badge> : null}
        </div>
        <div className="text-muted-foreground flex flex-col gap-0.5">
          {lines.map((line) => (
            <p key={line.label}>
              {line.label}: <span className="text-foreground">{line.value}</span>
            </p>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium">{title}</span>
      {method.label ? (
        <span className="text-muted-foreground text-xs">{typeLabel}</span>
      ) : null}
      <Badge variant="outline" className="text-[10px]">
        {currency}
      </Badge>
      {def?.fields.find((f) => f.hint)?.hint ? (
        <p className="text-muted-foreground w-full text-xs">{def.fields.find((f) => f.hint)?.hint}</p>
      ) : null}
    </div>
  )
}

export function PaymentMethodAccountLines({
  method,
}: {
  method: Pick<RafflePaymentMethod, "method_type" | "account_info">
}) {
  const lines = formatAccountInfoForDisplay(
    method.method_type as PaymentMethod,
    method.account_info,
  )
  if (lines.length === 0) return null

  return (
    <div className="text-muted-foreground flex flex-col gap-0.5 text-sm">
      {lines.map((line) => (
        <p key={line.label}>
          {line.label}: <span className="text-foreground">{line.value}</span>
        </p>
      ))}
    </div>
  )
}
