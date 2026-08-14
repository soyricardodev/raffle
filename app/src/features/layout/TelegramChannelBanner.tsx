import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { SocialBrandIcon } from "@/features/layout/social-icons"
import { resolveSupportChannel } from "@/features/layout/social-links"
import {
  dismissTelegramChannelBanner,
  isTelegramChannelBannerDismissed,
  shouldShowTelegramChannelBanner,
} from "@/features/layout/telegram-channel-banner-storage"
import { usePublicBranding } from "@/features/layout/use-public-branding"

export function TelegramChannelBanner() {
  const branding = usePublicBranding()
  const [dismissed, setDismissed] = useState(false)
  const support = resolveSupportChannel({
    whatsappEnabled: branding?.whatsappEnabled ?? false,
    social: branding?.social,
    promo: branding?.purchaseSuccessPromo,
  })

  useEffect(() => {
    if (isTelegramChannelBannerDismissed()) setDismissed(true)
  }, [])

  if (
    !shouldShowTelegramChannelBanner({
      dismissed,
      supportKind: support.kind,
      supportHref: support.supportHref,
    })
  ) {
    return null
  }

  return (
    <div
      role="region"
      aria-label="Aviso: el canal principal es Telegram"
      data-testid="telegram-channel-banner"
      className="bg-[#2AABEE] text-white"
    >
      <div className="mx-auto flex max-w-lg items-center gap-1 px-1.5 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] sm:px-2">
        <a
          href={support.supportHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-0.5 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            <SocialBrandIcon id="telegram" className="size-7" />
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold tracking-tight sm:text-[13px]">
            Ahora el canal principal es Telegram
          </span>
          <span className="shrink-0 rounded-full bg-white/20 px-2 py-1 text-[11px] font-bold">
            Escribir
          </span>
        </a>
        <button
          type="button"
          aria-label="Cerrar aviso"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white/90 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
          onClick={() => {
            dismissTelegramChannelBanner()
            setDismissed(true)
          }}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
