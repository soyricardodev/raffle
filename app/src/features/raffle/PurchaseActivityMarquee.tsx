import { Fragment } from "react"
import { cn } from "@/lib/utils"

type PurchaseActivityMarqueeProps = {
  items: string[]
  className?: string
  durationSec?: number
}

export function marqueeDurationSec(itemCount: number): number {
  return Math.max(22, Math.min(50, itemCount * 5))
}

function MarqueeCopy({ items, copyId }: { items: string[]; copyId: string }) {
  return (
    <div
      className="live-activity-marquee-group flex shrink-0 flex-nowrap items-center"
      aria-hidden={copyId === "b" ? true : undefined}
    >
      {items.map((label, index) => (
        <Fragment key={`${copyId}-${index}-${label}`}>
          <span className="text-foreground/80 shrink-0 px-3 text-xs font-medium whitespace-nowrap first:pl-0 sm:text-[13px]">
            {label}
          </span>
          <span className="text-foreground/25 shrink-0 select-none" aria-hidden>
            ·
          </span>
        </Fragment>
      ))}
    </div>
  )
}

export function PurchaseActivityMarquee({
  items,
  className,
  durationSec,
}: PurchaseActivityMarqueeProps) {
  if (items.length === 0) return null

  const duration = durationSec ?? marqueeDurationSec(items.length)

  return (
    <div
      className={cn(
        "live-activity-marquee-viewport relative min-w-0 flex-1 overflow-hidden",
        className,
      )}
    >
      <div
        className="live-activity-marquee-track flex w-max flex-nowrap will-change-transform"
        style={{ animationDuration: `${duration}s` }}
      >
        <MarqueeCopy items={items} copyId="a" />
        <MarqueeCopy items={items} copyId="b" />
      </div>
    </div>
  )
}
