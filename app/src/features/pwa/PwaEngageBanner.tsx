import { Bell, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PWA_INSTALL_CTA,
  PWA_INSTALL_TITLE,
  PWA_NOTIFY_BLOCKED_CTA,
  PWA_NOTIFY_BLOCKED_TITLE,
  PWA_NOTIFY_CTA,
  PWA_NOTIFY_TITLE,
} from "@/features/pwa/pwa-copy"
import type { usePwaEngage } from "@/features/pwa/use-pwa-engage"
import { cn } from "@/lib/utils"

export function PwaEngageBanner({ engage }: { engage: ReturnType<typeof usePwaEngage> }) {
  const allDone = engage.standalone && engage.notifyComplete
  if (!engage.bannerVisible || engage.sheetOpen || engage.iosGuideOpen || allDone) {
    return null
  }

  const needsNotify = engage.canNotifyHere && !engage.notifyComplete
  const needsInstall = engage.canOfferInstall
  if (!needsNotify && !needsInstall) return null

  const label = needsNotify
    ? engage.notifyBlocked
      ? PWA_NOTIFY_BLOCKED_TITLE
      : PWA_NOTIFY_TITLE
    : PWA_INSTALL_TITLE
  const cta = needsNotify
    ? engage.notifyBlocked
      ? PWA_NOTIFY_BLOCKED_CTA
      : PWA_NOTIFY_CTA
    : PWA_INSTALL_CTA

  return (
    <div
      data-testid="pwa-engage-banner"
      className={cn(
        "pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3",
        "bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.18)]",
          "border-primary/40 bg-card/95 supports-backdrop-filter:backdrop-blur-md",
          "transition-[transform,opacity] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "@starting-style:translate-y-3 @starting-style:opacity-0",
        )}
      >
        <span className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-[0_6px_16px_color-mix(in_oklch,var(--primary)_40%,transparent)]">
          {needsNotify ? (
            <Bell className="size-5" aria-hidden />
          ) : (
            <Download className="size-5" aria-hidden />
          )}
        </span>
        <p className="min-w-0 flex-1 text-sm leading-snug font-semibold">{label}</p>
        <Button
          size="sm"
          className="h-10 shrink-0 px-3.5 text-xs font-semibold shadow-sm transition-transform duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
          onClick={() => engage.openSheet(needsNotify ? "notify" : "install")}
        >
          {cta}
        </Button>
      </div>
    </div>
  )
}
