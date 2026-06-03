import {
  buildTickerViewModel,
  type LivePurchaseActivityVariant,
} from "@/features/raffle/live-activity-ticker-config"
import { PurchaseActivityMarquee } from "@/features/raffle/PurchaseActivityMarquee"
import { useRaffleLiveDataOrFetch } from "@/features/raffle/raffle-live-context"
import { cn } from "@/lib/utils"

export type { LivePurchaseActivityVariant }

type LivePurchaseActivityTickerProps = {
  variant: LivePurchaseActivityVariant
  raffleId?: string | number
  className?: string
}

function TickerShell({
  view,
  variant,
  className,
}: {
  view: ReturnType<typeof buildTickerViewModel>
  variant: LivePurchaseActivityVariant
  className?: string
}) {
  return (
    <div
      className={cn(
        "border-border/50 bg-muted/30 border-b",
        view.isLiveBar && "live-activity-bar-live",
        className,
      )}
      aria-live="polite"
      aria-label={view.ariaSummary}
      data-testid="live-purchase-activity-ticker"
      data-variant={variant}
    >
      <div className="mx-auto flex h-8 max-w-lg items-center gap-2 overflow-hidden px-3 sm:h-9 sm:px-4">
        {view.label}
        <div className="bg-border/60 h-4 w-px shrink-0" aria-hidden />
        <PurchaseActivityMarquee items={view.marqueeItems} durationSec={view.marqueeDurationSec} />
      </div>
    </div>
  )
}

function LivePurchaseActivityTickerLive({
  raffleId,
  className,
}: {
  raffleId: string | number
  className?: string
}) {
  const live = useRaffleLiveDataOrFetch(raffleId)
  const view = buildTickerViewModel("live", {
    activeBuyersCount: live.data?.activeBuyersCount ?? 0,
    purchases: live.data?.recentPurchases ?? [],
  })
  return <TickerShell view={view} variant="live" className={className} />
}

export function LivePurchaseActivityTicker({
  variant,
  raffleId,
  className,
}: LivePurchaseActivityTickerProps) {
  if (variant === "live") {
    if (raffleId == null) return null
    return <LivePurchaseActivityTickerLive raffleId={raffleId} className={className} />
  }

  const view = buildTickerViewModel(variant, { activeBuyersCount: 0, purchases: [] })
  return <TickerShell view={view} variant={variant} className={className} />
}
