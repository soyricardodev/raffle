import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@phosphor-icons/react"
import { getPurchaseStatusClass, getStatusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const LEGEND_ITEMS = [
  { status: "pending", Icon: ClockIcon },
  { status: "approved", Icon: CheckCircleIcon },
  { status: "rejected", Icon: XCircleIcon },
] as const

export function VerifyPurchaseStatusLegend() {
  return (
    <div
      className="border-border/60 bg-muted/20 rounded-xl border px-3 py-2.5"
      aria-label="Significado de estados de compra"
    >
      <p className="text-muted-foreground mb-2 text-xs font-medium">Estados de tu compra</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {LEGEND_ITEMS.map(({ status, Icon }) => (
          <li key={status} className="flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                getPurchaseStatusClass(status),
              )}
            >
              <Icon className="size-3.5" weight="fill" aria-hidden />
              {getStatusLabel(status)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
