import { Button } from "@/components/ui/button"
import type { ResolvedPurchaseSuccessPromo } from "@/features/raffle/purchase-form/resolve-purchase-success-promo"
import type { RefObject } from "react"

const WHATSAPP_ICON = "/brand/social/whatsapp.svg"
const INSTAGRAM_ICON = "/brand/social/instagram.svg"

type PurchaseSuccessPromoSectionProps = {
  promo: ResolvedPurchaseSuccessPromo
  whatsappLinkRef: RefObject<HTMLAnchorElement | null>
  onWhatsappClick: () => void
  onInstagramClick: () => void
}

export function PurchaseSuccessPromoSection({
  promo,
  whatsappLinkRef,
  onWhatsappClick,
  onInstagramClick,
}: PurchaseSuccessPromoSectionProps) {
  if (!promo.shouldShow) return null

  return (
    <section
      className="border-[#25D366]/25 from-[#25D366]/12 mx-4 mb-2 shrink-0 rounded-xl border bg-gradient-to-br to-emerald-500/5 p-3 shadow-sm"
      aria-labelledby="purchase-success-promo-title"
    >
      <div className="flex items-start gap-2.5">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          aria-hidden
        >
          <img
            src={WHATSAPP_ICON}
            alt=""
            className="size-5 brightness-0 invert"
            width={20}
            height={20}
          />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3
            id="purchase-success-promo-title"
            className="text-sm leading-tight font-semibold text-foreground"
          >
            {promo.title || "Únete a nuestra comunidad"}
          </h3>
          {promo.description ? (
            <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{promo.description}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 flex flex-col gap-2">
        {promo.whatsappHref ? (
          <Button
            className="min-h-11 w-full border-0 bg-[#25D366] text-white shadow-sm hover:bg-[#1ebe5d] focus-visible:ring-[#25D366]/50"
            asChild
          >
            <a
              ref={whatsappLinkRef}
              href={promo.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Unirme al canal de WhatsApp"
              onClick={onWhatsappClick}
            >
              <img
                src={WHATSAPP_ICON}
                alt=""
                className="mr-2 size-4 brightness-0 invert"
                width={16}
                height={16}
                aria-hidden
              />
              Unirme al WhatsApp
            </a>
          </Button>
        ) : null}
        {promo.instagramHref ? (
          <Button variant="outline" size="sm" className="min-h-9 w-full" asChild>
            <a
              href={promo.instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Seguir en Instagram"
              onClick={onInstagramClick}
            >
              <img src={INSTAGRAM_ICON} alt="" className="mr-2 size-4" width={16} height={16} aria-hidden />
              Seguir en Instagram
            </a>
          </Button>
        ) : null}
      </div>
    </section>
  )
}
