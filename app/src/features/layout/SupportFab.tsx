import { SocialBrandIcon } from "@/features/layout/social-icons"
import { resolveSupportChannel } from "@/features/layout/social-links"
import { usePublicBranding } from "@/features/layout/use-public-branding"
import { cn } from "@/lib/utils"

export function SupportFab() {
  const branding = usePublicBranding()
  const support = resolveSupportChannel({
    whatsappEnabled: branding?.whatsappEnabled ?? false,
    social: branding?.social,
    promo: branding?.purchaseSuccessPromo,
  })

  if (!support.supportHref) return null

  const isTelegram = support.kind === "telegram"

  return (
    <a
      href={support.supportHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Soporte por ${support.label}`}
      className={cn(
        "fixed right-4 z-[60] flex size-14 min-h-11 min-w-14 items-center justify-center rounded-full",
        "border-border/80 bg-card border shadow-[0_4px_20px_rgba(0,0,0,0.12)]",
        "transition-[transform,box-shadow] hover:shadow-[0_6px_24px_rgba(0,0,0,0.16)] hover:scale-[1.03]",
        "focus-visible:ring-3 active:scale-[0.97]",
        "support-fab bottom-[max(1rem,env(safe-area-inset-bottom))]",
        "dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)]",
        isTelegram && "overflow-hidden border-0 bg-transparent",
      )}
    >
      {isTelegram ? (
        <SocialBrandIcon id="telegram" className="size-14" />
      ) : (
        <span
          className="flex size-11 items-center justify-center rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          style={{ backgroundColor: support.brandColor }}
          aria-hidden
        >
          <img
            src={support.iconSrc}
            alt=""
            className="size-6 brightness-0 invert"
            width={24}
            height={24}
          />
        </span>
      )}
    </a>
  )
}
