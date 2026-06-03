import type { RefObject } from "react"
import { Button } from "@/components/ui/button"
import type { ResolvedPurchaseSuccessPromo } from "@/features/raffle/purchase-form/resolve-purchase-success-promo"

const WHATSAPP_ICON = "/brand/social/whatsapp.svg"
const INSTAGRAM_ICON = "/brand/social/instagram.svg"
const TIKTOK_ICON = "/brand/social/tiktok.svg"

type PurchaseSuccessPromoSectionProps = {
  promo: ResolvedPurchaseSuccessPromo
  whatsappLinkRef: RefObject<HTMLAnchorElement | null>
  onWhatsappClick: () => void
  onInstagramClick: () => void
  onTiktokClick: () => void
  onSocialLinkClick: (id: string) => void
}

export function PurchaseSuccessPromoSection({
  promo,
  whatsappLinkRef,
  onWhatsappClick,
  onInstagramClick,
  onTiktokClick,
  onSocialLinkClick,
}: PurchaseSuccessPromoSectionProps) {
  if (!promo.shouldShow) return null

  const finalizeTitle = promo.title || "Para finalizar tu compra"
  const finalizeDescription =
    promo.description || "Escríbeme por WhatsApp con tus datos y te confirmo la compra."

  const promoInstagram =
    promo.instagramHref &&
    !promo.socialLinks.some((link) => link.id === "instagram" && link.href === promo.instagramHref)
  const promoTiktok =
    promo.tiktokHref &&
    !promo.socialLinks.some((link) => link.id === "tiktok" && link.href === promo.tiktokHref)

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
            {finalizeTitle}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{finalizeDescription}</p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-col gap-2">
        {promo.whatsappFinalizeHref ? (
          <Button
            className="min-h-11 w-full border-0 bg-[#25D366] text-white shadow-sm hover:bg-[#1ebe5d] focus-visible:ring-[#25D366]/50"
            asChild
          >
            <a
              ref={whatsappLinkRef}
              href={promo.whatsappFinalizeHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Finalizar compra por WhatsApp"
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
              Finalizar por WhatsApp
            </a>
          </Button>
        ) : null}

        {promo.whatsappChannelHref ? (
          <Button variant="outline" size="sm" className="min-h-9 w-full" asChild>
            <a
              href={promo.whatsappChannelHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Unirme al canal de WhatsApp"
            >
              <img
                src={WHATSAPP_ICON}
                alt=""
                className="mr-2 size-4"
                width={16}
                height={16}
                aria-hidden
              />
              Unirme al canal de WhatsApp
            </a>
          </Button>
        ) : null}

        {promoInstagram ? (
          <Button variant="outline" size="sm" className="min-h-9 w-full" asChild>
            <a
              href={promo.instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Seguir en Instagram"
              onClick={onInstagramClick}
            >
              <img
                src={INSTAGRAM_ICON}
                alt=""
                className="mr-2 size-4"
                width={16}
                height={16}
                aria-hidden
              />
              Seguir en Instagram
            </a>
          </Button>
        ) : null}

        {promoTiktok ? (
          <Button variant="outline" size="sm" className="min-h-9 w-full" asChild>
            <a
              href={promo.tiktokHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Seguir en TikTok"
              onClick={onTiktokClick}
            >
              <img src={TIKTOK_ICON} alt="" className="mr-2 size-4" width={16} height={16} aria-hidden />
              Seguir en TikTok
            </a>
          </Button>
        ) : null}

        {promo.socialLinks.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-border/60 pt-2">
            <p className="text-muted-foreground text-xs font-medium">Síguenos en redes</p>
            <div className="flex flex-wrap gap-2">
              {promo.socialLinks.map((link) => (
                <Button key={link.id} variant="outline" size="sm" className="min-h-9" asChild>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    onClick={() => onSocialLinkClick(link.id)}
                  >
                    {link.iconSrc ? (
                      <img
                        src={link.iconSrc}
                        alt=""
                        className="mr-2 size-4"
                        width={16}
                        height={16}
                        aria-hidden
                      />
                    ) : null}
                    {link.label}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
