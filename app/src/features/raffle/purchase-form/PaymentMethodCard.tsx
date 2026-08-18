import { CheckCircleIcon, LockKeyIcon } from "@phosphor-icons/react"
import {
  paymentMethodCurrencyLabel,
  paymentMethodDisplayLabel,
} from "@raffle/shared/payment-methods"
import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import type { MethodEligibility } from "@/features/raffle/payment-method-eligibility"
import {
  paymentMethodCardActiveClassName,
  paymentMethodCardInactiveClassName,
  paymentMethodCardPromoClassName,
} from "@/features/raffle/purchase-form/field-styles"
import { PaymentDetailsPanel } from "@/features/raffle/purchase-form/PaymentDetailsPanel"
import type { RafflePaymentMethod } from "@/features/raffle/types"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

type PaymentMethodCardProps = {
  method: RafflePaymentMethod
  active: boolean
  disabled: boolean
  eligibility: MethodEligibility
  promoBadge?: string
  total: number
  quantity: number
  onSelect: (id: number) => void
}

export const PaymentMethodCard = memo(function PaymentMethodCard({
  method,
  active,
  disabled,
  eligibility,
  promoBadge,
  total,
  quantity,
  onSelect,
}: PaymentMethodCardProps) {
  const { locked, minTickets } = eligibility
  const currency = paymentMethodCurrencyLabel(method.method_type)
  const title = paymentMethodDisplayLabel(method)
  const detailsId = `payment-method-details-${method.id}`

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border shadow-sm transition-all",
        active ? paymentMethodCardActiveClassName : paymentMethodCardInactiveClassName,
        promoBadge && !active && paymentMethodCardPromoClassName,
        locked && "opacity-50",
      )}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: These custom radio cards preserve the existing large mobile tap target. */}
      <button
        type="button"
        role="radio"
        aria-checked={active}
        aria-controls={active ? detailsId : undefined}
        data-testid={`payment-method-${method.id}`}
        disabled={disabled || locked}
        onClick={() => onSelect(method.id)}
        className={cn(
          "group flex min-h-16 w-full items-center gap-3 p-3 text-left transition-colors",
          "focus-visible:ring-[3px] focus-visible:ring-emerald-500/40 focus-visible:outline-none",
          locked && "cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            active
              ? "border-white/90 bg-white/20"
              : "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
          )}
          aria-hidden
        >
          {active ? (
            <CheckCircleIcon weight="fill" className="text-white" />
          ) : (
            <span className="size-3 rounded-full bg-emerald-500" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold">{title}</span>
          <span className={cn("block text-xs", active ? "text-white/85" : "text-muted-foreground")}>
            Paga en {currency}
          </span>
        </span>
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {active ? (
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-sm font-extrabold text-white tabular-nums">
              {formatCurrency(total, currency)}
            </span>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-500/35 text-[10px] text-emerald-800 dark:text-emerald-200"
            >
              {currency}
            </Badge>
          )}
          {promoBadge ? (
            <Badge
              className="shrink-0 bg-emerald-600 text-[10px] font-semibold text-white tabular-nums hover:bg-emerald-600"
              title="Promoción exclusiva de este método"
            >
              {promoBadge}
            </Badge>
          ) : null}
          {locked ? (
            <span className="text-destructive flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px]">
              <LockKeyIcon />
              Mínimo {minTickets} boletos
            </span>
          ) : null}
        </span>
      </button>

      {active ? (
        <div id={detailsId} className="payment-method-details-enter px-3 pb-3">
          <div className="mb-2.5 border-t border-white/25" />
          <PaymentDetailsPanel method={method} total={total} quantity={quantity} />
        </div>
      ) : null}
    </div>
  )
})
