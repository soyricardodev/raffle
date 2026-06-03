import { whatsAppHref } from "@/features/layout/social-links"
import { usePublicBranding } from "@/features/layout/use-public-branding"
import { cn } from "@/lib/utils"

const WHATSAPP_ICON = "/brand/social/whatsapp.svg"

export function WhatsAppFab() {
  const branding = usePublicBranding()
  const href = whatsAppHref(branding?.social.whatsapp ?? "")

  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soporte por WhatsApp"
      className={cn(
        "fixed right-4 z-[60] flex size-14 min-h-11 min-w-14 items-center justify-center rounded-full",
        "border-border/80 bg-card border shadow-[0_4px_20px_rgba(0,0,0,0.12)]",
        "transition-[transform,box-shadow] hover:shadow-[0_6px_24px_rgba(0,0,0,0.16)] hover:scale-[1.03]",
        "focus-visible:ring-3 focus-visible:ring-[#25D366]/45 active:scale-[0.97]",
        "whatsapp-fab bottom-[max(1rem,env(safe-area-inset-bottom))]",
        "dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)]",
      )}
    >
      <span
        className="flex size-11 items-center justify-center rounded-full bg-[#25D366] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
        aria-hidden
      >
        <img
          src={WHATSAPP_ICON}
          alt=""
          className="size-6 brightness-0 invert"
          width={24}
          height={24}
        />
      </span>
    </a>
  )
}
