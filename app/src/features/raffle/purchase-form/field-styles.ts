import { cn } from "@/lib/utils"

export const formInputHeightClassName = "h-10"

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
  "h-10 min-w-11 shrink-0 rounded-full px-3.5 text-sm font-medium tabular-nums",
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

export const paymentDetailsPanelClassName = cn(
  "rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/12 via-card to-teal-500/6 p-3 shadow-sm",
)

export const paymentCompletionBoxClassName =
  "flex flex-col gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3"

/** CTA verificar boletos: amarillo suave, legible en light y dark. */
export const verifyTicketsCtaCardClassName = cn(
  "rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-100 via-amber-50/90 to-card py-0 shadow-sm shadow-amber-500/15",
  "dark:border-amber-500/40 dark:from-amber-500/22 dark:via-amber-500/12 dark:to-card dark:shadow-amber-500/10",
)

export const verifyTicketsCtaIconClassName = cn(
  "flex size-10 shrink-0 items-center justify-center rounded-xl",
  "bg-amber-200/90 text-amber-900",
  "dark:bg-amber-500/35 dark:text-amber-50",
)

export const verifyTicketsCtaHintClassName = cn(
  "text-center text-xs text-amber-900/75",
  "dark:text-amber-100/85",
)

export const verifyTicketsCtaButtonClassName = cn(
  "min-h-11 w-full border text-base font-semibold shadow-sm",
  "border-amber-400/70 bg-amber-200 text-amber-950 hover:bg-amber-300/95",
  "dark:border-amber-400/50 dark:bg-amber-500/40 dark:text-amber-50 dark:hover:bg-amber-500/55",
)

/** Chip de número de boleto (post-compra y listados similares). */
export const purchaseSuccessTicketBadgeClassName = cn(
  "h-9 min-w-[3.25rem] rounded-lg border px-2.5 font-mono text-sm font-bold tabular-nums shadow-sm",
  "border-amber-400/70 bg-gradient-to-br from-amber-200 to-amber-100 text-amber-950",
  "dark:border-amber-400/50 dark:from-amber-500/55 dark:to-amber-500/35 dark:text-amber-50",
)

export const purchaseSuccessTicketsSectionClassName = cn(
  "flex min-h-[124px] flex-1 flex-col rounded-xl border p-3 shadow-sm",
  "border-amber-400/40 bg-gradient-to-br from-amber-100/90 via-amber-50/60 to-card",
  "dark:border-amber-500/35 dark:from-amber-500/18 dark:via-amber-500/10 dark:to-card",
)
