import { TrendingUp } from "lucide-react"
import { useId } from "react"
import type { RaffleSalesProgress } from "@/lib/raffle-progress"
import { cn } from "@/lib/utils"

type SalesProgressBarProps = {
  progress: RaffleSalesProgress
  variant?: "overlay" | "inline"
  animated?: boolean
  /** Ticket count line under the bar (hidden on image overlay by default). */
  showDetail?: boolean
  className?: string
}

function formatCount(value: number) {
  return new Intl.NumberFormat("es-VE").format(value)
}

export function SalesProgressBar({
  progress,
  variant = "overlay",
  animated = true,
  showDetail: showDetailProp,
  className,
}: SalesProgressBarProps) {
  const { percentage, occupied, total } = progress
  const isOverlay = variant === "overlay"
  const showDetail = showDetailProp ?? !isOverlay
  const labelId = useId()
  const showMotion = animated

  return (
    <div className={cn("space-y-2", className)} role="group" aria-labelledby={labelId}>
      <div className="flex items-end justify-between gap-3">
        <p
          id={labelId}
          className={cn(
            "uppercase tracking-wide",
            isOverlay
              ? "font-heading text-base font-extrabold text-white sm:text-lg"
              : "inline-flex items-center gap-2.5 text-xs font-semibold text-muted-foreground",
          )}
        >
          {!isOverlay ? (
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/20"
              aria-hidden
            >
              <TrendingUp className="size-3.5" strokeWidth={2.5} />
            </span>
          ) : null}
          {isOverlay ? "Vendidos" : "Progreso de ventas"}
        </p>
        <p
          className={cn(
            "font-heading text-2xl font-extrabold tabular-nums leading-none sm:text-3xl",
            isOverlay ? "text-white" : "text-foreground",
            showMotion && isOverlay && "sales-progress-percent",
          )}
          aria-hidden
        >
          {percentage.toFixed(1)}%
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-valuetext={`${percentage.toFixed(1)} por ciento vendido, ${formatCount(occupied)} de ${formatCount(total)} boletos`}
        className={cn(
          "relative overflow-hidden rounded-full",
          isOverlay
            ? "sales-progress-track-overlay h-5 border border-white/25 bg-black/50 shadow-inner sm:h-6"
            : "h-3 border border-border/70 bg-muted/80 shadow-inner",
          showMotion && isOverlay && "sales-progress-track-overlay",
        )}
      >
        <div
          className={cn(
            "relative h-full overflow-hidden rounded-full transition-[width] duration-700 ease-out",
            showMotion ? "sales-progress-fill" : "bg-primary",
            isOverlay &&
              showMotion &&
              "shadow-[0_0_14px_color-mix(in_oklch,var(--brand-accent,var(--primary))_50%,transparent)]",
          )}
          style={{ width: `${percentage}%` }}
        >
          {showMotion ? (
            <>
              <span
                className="sales-progress-shimmer pointer-events-none absolute inset-0"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"
                aria-hidden
              />
            </>
          ) : null}
        </div>
        {isOverlay ? (
          <span
            className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/20"
            aria-hidden
          />
        ) : null}
      </div>

      {showDetail ? (
        <p
          className={cn(
            "text-[11px] tabular-nums sm:text-xs",
            isOverlay ? "text-white/70" : "text-muted-foreground",
          )}
        >
          {formatCount(occupied)} de {formatCount(total)} boletos
          {!isOverlay ? (
            <span className="text-muted-foreground/80">
              {" "}
              · {formatCount(total - occupied)} disponibles
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}
