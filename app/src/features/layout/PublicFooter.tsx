import {
  DEFAULT_OFFICIAL_FOOTER_DESCRIPTION,
  DEFAULT_OFFICIAL_FOOTER_HEADING,
  resolveOfficialFooterLogos,
} from "@/features/layout/footer-defaults"
import { SocialLinkIcon } from "@/features/layout/social-icons"
import {
  buildSocialLinks,
  DEFAULT_TELEGRAM_CHANNEL_URL,
  formatWhatsAppDisplayNumber,
  resolveSupportChannel,
} from "@/features/layout/social-links"
import { PUBLIC_FOOTER_LEGAL_ID } from "@/features/layout/sticky-purchase-cta"
import { usePublicBranding } from "@/features/layout/use-public-branding"

const TELEGRAM_SUPPORT_NUMBER = "+58 424 474 2262"

export function PublicFooter() {
  const branding = usePublicBranding()

  const siteInfo = branding?.siteInfo ?? { site_name: "", tagline: "", runlot_id: "" }
  const social = branding?.social ?? {
    whatsapp: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    telegram: "",
    support_channel: "telegram",
  }
  const images = branding?.images
  const promo = branding?.purchaseSuccessPromo

  const socialLinks = buildSocialLinks(social, {
    whatsappChannelUrl: promo?.whatsapp_channel_url ?? "",
    telegramChannelUrl: promo?.telegram_channel_url.trim() || DEFAULT_TELEGRAM_CHANNEL_URL,
  })
  const officialLogos = resolveOfficialFooterLogos(images?.official_logos)
  const runlotId = siteInfo.runlot_id?.trim() ?? ""
  const support = resolveSupportChannel({
    whatsappEnabled: branding?.whatsappEnabled ?? false,
    social,
    promo,
  })
  const supportHref = support.supportHref
  const supportNumber =
    support.kind === "whatsapp"
      ? formatWhatsAppDisplayNumber(social.whatsapp) || "WhatsApp"
      : TELEGRAM_SUPPORT_NUMBER
  const supportHeading =
    support.kind === "whatsapp" ? "Contacto directo a WhatsApp" : "Contacto directo a Telegram"

  const hasMainContent = Boolean(supportHref) || socialLinks.length > 0

  return (
    <footer className="public-site-footer border-border/80 bg-muted/40 mt-auto border-t">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10">
        {hasMainContent ? (
          <div className="flex flex-col gap-6">
            {supportHref ? (
              <div>
                <h2 className="mb-3 text-xs font-semibold tracking-wide uppercase">
                  {supportHeading}
                </h2>
                <p className="text-muted-foreground mb-2 text-sm">Escríbeme y te ayudo</p>
                <a
                  href={supportHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
                >
                  <SocialLinkIcon id={support.kind} iconSrc={support.iconSrc} className="size-5" />
                  {supportNumber}
                </a>
              </div>
            ) : null}

            {socialLinks.length > 0 ? (
              <div>
                <h2 className="mb-3 text-xs font-semibold tracking-wide uppercase">Síguenos</h2>
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      className="bg-background/80 border-border/80 hover:bg-background flex size-11 items-center justify-center rounded-full border shadow-sm transition-colors"
                    >
                      {link.iconSrc || link.id === "telegram" || link.id === "tiktok" ? (
                        <SocialLinkIcon id={link.id} iconSrc={link.iconSrc} className="size-5" />
                      ) : (
                        <span className="text-xs font-semibold" aria-hidden>
                          {link.label.slice(0, 1)}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={hasMainContent ? "border-border/60 border-t pt-6" : ""}>
          <h2 className="text-foreground mb-2 text-center text-sm font-semibold">
            {DEFAULT_OFFICIAL_FOOTER_HEADING}
          </h2>
          <p className="text-muted-foreground mb-5 text-center text-xs leading-relaxed">
            {DEFAULT_OFFICIAL_FOOTER_DESCRIPTION}
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-6">
            {officialLogos.map((logo, index) => (
              <li key={`${logo.image}-${index}`}>
                <img
                  src={logo.image}
                  alt={logo.alt || "Logo oficial"}
                  className="h-14 w-auto max-w-[140px] object-contain opacity-95"
                  loading="lazy"
                  width={140}
                  height={56}
                />
              </li>
            ))}
          </ul>
        </div>

        <div
          id={PUBLIC_FOOTER_LEGAL_ID}
          className="text-muted-foreground border-border/60 space-y-2 border-t pt-6 text-center text-xs"
        >
          {runlotId ? (
            <p>
              <span className="text-foreground/80 font-medium">RUNLOT:</span> {runlotId}
            </p>
          ) : null}
          <p>
            © {new Date().getFullYear()}
            {siteInfo.site_name ? ` ${siteInfo.site_name}.` : ""} Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
