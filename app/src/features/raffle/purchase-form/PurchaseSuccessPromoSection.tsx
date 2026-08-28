import type { RefObject } from "react"
import { Button } from "@/components/ui/button"
import { SocialBrandIcon, SocialLinkIcon } from "@/features/layout/social-icons"
import { WHATSAPP_BRAND_COLOR, WHATSAPP_ICON } from "@/features/layout/social-links"
import { ChannelJoinLinks } from "@/features/raffle/purchase-form/ChannelJoinLinks"
import { purchaseSuccessFinalizeCopy } from "@/features/raffle/purchase-form/purchase-success-copy"
import type { ResolvedPurchaseSuccessPromo } from "@/features/raffle/purchase-form/resolve-purchase-success-promo"

type PurchaseSuccessPromoSectionProps = {
  promo: ResolvedPurchaseSuccessPromo
  supportLinkRef: RefObject<HTMLAnchorElement | null>
  onSupportClick: () => void
  onInstagramClick: () => void
  onTiktokClick: () => void
  onSocialLinkClick: (id: string) => void
  showCta?: boolean
  showSocials?: boolean
}

export function PurchaseSuccessPromoSection({
  promo,
  supportLinkRef,
  onSupportClick,
  onInstagramClick,
  onTiktokClick,
  onSocialLinkClick,
  showCta = true,
  showSocials = true,
}: PurchaseSuccessPromoSectionProps) {
  if (!promo.shouldShow) return null

  const hasFinalizeCta = Boolean(promo.supportFinalizeHref)
  const finalizeCopy = hasFinalizeCta ? purchaseSuccessFinalizeCopy(promo.supportLabel) : null
  const socialLinks = promo.socialLinks
    .filter((link) => link.id !== "whatsapp")
    .map((link) => {
      if (link.id === "instagram" && promo.instagramHref) {
        return { ...link, href: promo.instagramHref }
      }
      if (link.id === "tiktok" && promo.tiktokHref) return { ...link, href: promo.tiktokHref }
      return link
    })

  const renderCta = showCta && hasFinalizeCta && finalizeCopy
  const renderChannel = showSocials && Boolean(promo.supportChannelHref)
  const renderSocials = showSocials && socialLinks.length > 0
  if (!renderCta && !renderChannel && !renderSocials) return null

  return (
    <section
      className="flex shrink-0 flex-col gap-3 px-4"
      aria-label={renderCta ? "Siguiente paso" : "Redes"}
    >
      {renderCta && finalizeCopy ? (
        <Button
          className="min-h-12 w-full border-0 text-base font-semibold text-white shadow-sm transition-[transform,background-color] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
          style={{ backgroundColor: promo.supportBrandColor }}
          asChild
        >
          <a
            ref={supportLinkRef}
            href={promo.supportFinalizeHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={finalizeCopy.ctaLabel}
            onClick={onSupportClick}
          >
            <SocialBrandIcon
              id={promo.supportKind}
              className="mr-2 size-5"
              style={promo.supportKind === "whatsapp" ? { filter: "brightness(0) invert(1)" } : undefined}
            />
            {finalizeCopy.ctaLabel}
          </a>
        </Button>
      ) : null}

      {renderChannel || renderSocials ? (
        <div className="flex flex-col gap-2.5">
          {renderChannel && promo.supportChannelHref ? (
            <ChannelJoinLinks
              links={[
                {
                  id: "whatsapp",
                  label: "Únete a nuestro canal de WhatsApp",
                  href: promo.supportChannelHref,
                  brandColor: WHATSAPP_BRAND_COLOR,
                  iconSrc: WHATSAPP_ICON,
                },
              ]}
            />
          ) : null}
          {renderSocials ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {socialLinks.map((link) => (
                <Button
                  key={link.id}
                  variant="outline"
                  size="icon-sm"
                  className="size-9 rounded-full bg-background transition-transform duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
                  asChild
                >
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    title={link.label}
                    onClick={() => {
                      if (link.id === "instagram") onInstagramClick()
                      if (link.id === "tiktok") onTiktokClick()
                      onSocialLinkClick(link.id)
                    }}
                  >
                    <SocialLinkIcon id={link.id} iconSrc={link.iconSrc} className="size-5" />
                  </a>
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
