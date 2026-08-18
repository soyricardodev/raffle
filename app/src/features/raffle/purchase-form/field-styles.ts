import { cn } from "@/lib/utils"

export const formInputHeightClassName = "h-10"

export const fieldReadyInputClassName =
  "border-emerald-500/45 bg-emerald-500/8 ring-1 ring-emerald-500/20"

export const segmentToggleItemClassName = cn(
  "transition-colors",
  "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm",
  "data-[state=off]:text-muted-foreground",
)

export const segmentToggleRowClassName = cn("min-h-10 flex-1 px-2", segmentToggleItemClassName)

export const prefixToggleItemClassName = cn(
  "min-h-9 flex-1 px-1.5 font-mono text-xs",
  segmentToggleItemClassName,
)

/** Tarjeta destacada para pasos del formulario de compra (mobile-first). */
export const purchaseSectionCardClassName = cn(
  "rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-3 shadow-sm",
)

export const quickPickToggleItemClassName = cn(
  "h-10 min-w-0 flex-1 rounded-xl px-1 text-sm font-medium tabular-nums",
  segmentToggleItemClassName,
)

/** Paso de pago: verde asociado a confianza y acción positiva. */
export const paymentSectionCardClassName = cn(
  "rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-500/14 via-card to-teal-500/8 p-3 shadow-sm shadow-emerald-500/10",
)

export const paymentMethodCardActiveClassName = cn(
  "border-emerald-400 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white",
  "shadow-md shadow-emerald-900/25 ring-2 ring-emerald-400/45",
)

export const paymentMethodCardInactiveClassName = cn(
  "border-border bg-card/90 hover:border-emerald-500/55 hover:bg-emerald-500/10",
)

export const paymentMethodCardPromoClassName = "border-emerald-500/50 bg-emerald-500/10"

export const paymentCompletionBoxClassName =
  "flex flex-col gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3"

/** CTA final de compra: contraste fuerte + animación (ver `.purchase-submit-cta`). */
export const purchaseSubmitButtonClassName = cn(
  "purchase-submit-cta",
  "h-12 min-h-12 w-full gap-2 text-base font-bold tracking-wide sm:h-11 sm:min-h-11 sm:text-sm",
  "border-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white",
  "shadow-lg shadow-emerald-600/35 ring-2 ring-emerald-400/55",
  "hover:from-emerald-500 hover:via-emerald-400 hover:to-teal-400 hover:shadow-xl hover:shadow-emerald-500/40",
  "active:scale-[0.99]",
)

export {
  featuredTicketBadgeClassName as purchaseSuccessTicketBadgeClassName,
  featuredTicketSectionClassName as purchaseSuccessTicketsSectionClassName,
} from "@/features/tickets/ticket-badge-styles"
