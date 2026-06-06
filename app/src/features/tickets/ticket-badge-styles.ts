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
