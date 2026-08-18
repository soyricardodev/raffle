import { SocialBrandIcon } from "@/features/layout/social-icons"
import { resolveSupportChannel } from "@/features/layout/social-links"
import { usePublicBranding } from "@/features/layout/use-public-branding"

export function TelegramChannelBanner() {
  const branding = usePublicBranding()
  const support = resolveSupportChannel({
    whatsappEnabled: branding?.whatsappEnabled ?? false,
    social: branding?.social,
    promo: branding?.purchaseSuccessPromo,
  })

  if (support.kind !== "telegram" || !support.supportHref) {
    return null
  }

  return (
    <section
      aria-label="Aviso: ahora nos mudamos a Telegram"
      data-testid="telegram-channel-banner"
      className="bg-[#2AABEE] text-white"
    >
      <div className="mx-auto flex max-w-lg items-center px-1.5 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] sm:px-2">
        <a
          href={support.supportHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-0.5 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            <SocialBrandIcon id="telegram" className="size-7" />
          </span>
          <span className="min-w-0 flex-1 text-xs font-semibold tracking-tight sm:text-[13px]">
            Ahora nos mudamos a Telegram
          </span>
          <span className="shrink-0 rounded-full bg-white/20 px-2 py-1 text-[11px] font-bold leading-tight">
            Envia Nombre y Apellido
          </span>
        </a>
      </div>
    </section>
  )
}
