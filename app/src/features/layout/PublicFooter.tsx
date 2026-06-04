import { Link } from "@tanstack/react-router"
import { Mail, MapPin, Phone } from "lucide-react"
import {
  DEFAULT_OFFICIAL_FOOTER_DESCRIPTION,
  DEFAULT_OFFICIAL_FOOTER_HEADING,
  resolveOfficialFooterLogos,
} from "@/features/layout/footer-defaults"
import { buildSocialLinks } from "@/features/layout/social-links"
import { PUBLIC_FOOTER_LEGAL_ID } from "@/features/layout/sticky-purchase-cta"
import { usePublicBranding } from "@/features/layout/use-public-branding"
import { buildVerifyHref } from "@/features/verify/build-verify-href"

const FOOTER_NAV = [
  { label: "Inicio", to: "/" as const },
  { label: "Verificar boletos", to: "/verificar" as const },
] as const

export function PublicFooter() {
  const branding = usePublicBranding()

  const siteInfo = branding?.siteInfo ?? { site_name: "", tagline: "", runlot_id: "" }
  const contact = branding?.contact ?? { phone: "", email: "", address: "" }
  const social = branding?.social ?? {
    whatsapp: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    telegram: "",
  }
  const images = branding?.images
  const colors = branding?.colors

  const footerLogo = (images?.footer_logo.trim() || images?.logo.trim()) ?? ""
  const socialLinks = buildSocialLinks(social)
  const officialLogos = resolveOfficialFooterLogos(images?.official_logos)
  const runlotId = siteInfo.runlot_id?.trim() ?? ""

  const hasMainContent =
    siteInfo.site_name ||
    siteInfo.tagline ||
    contact.phone ||
    contact.email ||
    contact.address ||
    socialLinks.length > 0

  const brandColor = colors?.primary

  return (
    <footer className="public-site-footer border-border/80 bg-muted/40 mt-auto border-t">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10">
        {hasMainContent ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              {footerLogo ? (
                <img
                  src={footerLogo}
                  alt=""
                  className="h-9 w-auto max-w-[160px] object-contain object-left"
                  width={160}
                  height={36}
                />
              ) : siteInfo.site_name ? (
                <p
                  className="font-heading text-lg font-semibold tracking-tight"
                  style={{ color: brandColor ?? undefined }}
                >
                  {siteInfo.site_name}
                </p>
              ) : null}
              {siteInfo.tagline ? (
                <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                  {siteInfo.tagline}
                </p>
              ) : null}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h2 className="mb-3 text-xs font-semibold tracking-wide uppercase">Secciones</h2>
                <ul className="flex flex-col gap-2">
                  {FOOTER_NAV.map((item) => (
                    <li key={item.label}>
                      {item.to === "/verificar" ? (
                        <Link
                          {...buildVerifyHref()}
                          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <Link
                          to={item.to}
                          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="mb-3 text-xs font-semibold tracking-wide uppercase">Contacto</h2>
                <ul className="text-muted-foreground flex flex-col gap-2.5 text-sm">
                  {contact.phone ? (
                    <li className="flex items-start gap-2">
                      <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <a
                        href={`tel:${contact.phone.replace(/\s/g, "")}`}
                        className="hover:text-foreground"
                      >
                        {contact.phone}
                      </a>
                    </li>
                  ) : null}
                  {contact.email ? (
                    <li className="flex items-start gap-2">
                      <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <a
                        href={`mailto:${contact.email}`}
                        className="hover:text-foreground break-all"
                      >
                        {contact.email}
                      </a>
                    </li>
                  ) : null}
                  {contact.address ? (
                    <li className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <span>{contact.address}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>

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
                      {link.iconSrc ? (
                        <img src={link.iconSrc} alt="" className="size-5" width={20} height={20} />
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
