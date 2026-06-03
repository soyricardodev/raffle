import {
  buildTickerViewModel,
  type LivePurchaseActivityVariant,
} from "@/features/raffle/live-activity-ticker-config"
import { buildSocialLinks, type SocialLink } from "@/features/layout/social-links"
import { usePublicBranding } from "@/features/layout/use-public-branding"
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
  socialLinks = [],
}: {
  view: ReturnType<typeof buildTickerViewModel>
  variant: LivePurchaseActivityVariant
  className?: string
  socialLinks?: SocialLink[]
}) {
  const showSocialLinks = socialLinks.length > 0

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
      <div className="mx-auto flex min-h-9 max-w-lg items-center gap-2 overflow-hidden px-3 py-1 sm:min-h-10 sm:px-4">
        {view.label}
        <div className="bg-border/60 h-4 w-px shrink-0" aria-hidden />
        {showSocialLinks ? (
          <SocialFollowLinks links={socialLinks} />
        ) : (
          <PurchaseActivityMarquee items={view.marqueeItems} durationSec={view.marqueeDurationSec} />
        )}
      </div>
    </div>
  )
}

function SocialFollowLinks({ links }: { links: SocialLink[] }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="text-foreground/80 min-w-0 truncate text-xs font-medium sm:text-[13px]">
        Únete a nuestras redes
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Síguenos en ${link.label}`}
            title={link.label}
            className={cn(
              "bg-background/85 border-border/70 flex size-7 items-center justify-center rounded-full border shadow-sm",
              "transition-[transform,background-color,box-shadow] hover:bg-background hover:shadow-md hover:scale-105",
              "focus-visible:ring-ring/40 focus-visible:ring-2 focus-visible:outline-none active:scale-95",
            )}
          >
            <img src={link.iconSrc} alt="" className="size-4" width={16} height={16} />
          </a>
        ))}
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
  const branding = usePublicBranding()
  const socialLinks = buildSocialLinks(
    branding?.social ?? { whatsapp: "", instagram: "", facebook: "" },
  )
  const view = buildTickerViewModel("live", {
    activeBuyersCount: live.data?.activeBuyersCount ?? 0,
  })
  return <TickerShell view={view} variant="live" className={className} socialLinks={socialLinks} />
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

  const view = buildTickerViewModel(variant, { activeBuyersCount: 0 })
  return <TickerShell view={view} variant={variant} className={className} />
}
