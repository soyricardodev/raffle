import { cn } from "@/lib/utils"

/** Chip destacado para números de boleto (post-compra, verificación y admin). */
export const featuredTicketBadgeClassName = cn(
  "h-9 min-w-[3.25rem] rounded-lg border px-2.5 font-mono text-sm font-bold tabular-nums shadow-sm",
  "border-amber-400/70 bg-gradient-to-br from-amber-200 to-amber-100 text-amber-950",
  "dark:border-amber-400/50 dark:from-amber-500/55 dark:to-amber-500/35 dark:text-amber-50",
)

export const featuredTicketBadgeGridClassName = cn(
  "border-amber-300/40 bg-background/80 min-h-14 overflow-y-auto overscroll-contain rounded-lg border p-2",
)

export const featuredTicketSectionClassName = cn(
  "flex flex-col gap-2 rounded-xl border p-3 shadow-sm",
  "border-amber-400/40 bg-gradient-to-br from-amber-100/90 via-amber-50/60 to-card",
  "dark:border-amber-500/35 dark:from-amber-500/18 dark:via-amber-500/10 dark:to-card",
)

/** Row height for h-9 badges + gap-1.5 in the virtual grid. */
export const FEATURED_TICKET_ROW_STRIDE_PX = 42

/** Badges densos para listados admin (drawer de compra). */
export const adminPurchaseTicketBadgeClassName = cn(
  "h-6 min-w-0 rounded-md border px-0.5 font-mono text-xs font-bold tabular-nums shadow-none",
  "border-amber-400/60 bg-gradient-to-br from-amber-200/90 to-amber-100/80 text-amber-950",
  "dark:border-amber-400/45 dark:from-amber-500/45 dark:to-amber-500/25 dark:text-amber-50",
)

export const adminPurchaseTicketBadgeGridClassName = cn(
  "border-amber-300/35 bg-background/80 min-h-14 overflow-y-auto overscroll-contain rounded-lg border p-1.5",
)

/** Row height for h-6 badges + gap-1 in admin virtual grid. */
export const ADMIN_PURCHASE_TICKET_ROW_STRIDE_PX = 28
