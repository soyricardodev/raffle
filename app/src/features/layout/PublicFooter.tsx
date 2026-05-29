import { Link } from "@tanstack/react-router"
import { usePublicBranding } from "@/features/layout/use-public-branding"
import { buildSocialLinks } from "@/features/layout/social-links"
import { Mail, MapPin, Phone } from "lucide-react"

const FOOTER_NAV = [
  { label: "Inicio", to: "/" as const },
  { label: "Verificar boletos", to: "/verificar" as const },
] as const

export function PublicFooter() {
  const branding = usePublicBranding()

  if (!branding) {
    return <footer className="border-border/80 bg-muted/30 mt-auto border-t" aria-hidden />
  }

  const { siteInfo, contact, social, images, colors } = branding
  const footerLogo = images.footer_logo.trim() || images.logo.trim()
  const socialLinks = buildSocialLinks(social)
  const officialLogos = images.official_logos.filter((logo) => logo.image.trim())

  const hasContent =
    siteInfo.site_name ||
    siteInfo.tagline ||
    contact.phone ||
    contact.email ||
    contact.address ||
    socialLinks.length > 0 ||
    officialLogos.length > 0

  if (!hasContent) return null

  const brandColor = colors?.primary

  return (
    <footer className="border-border/80 bg-muted/40 mt-auto border-t">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10">
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
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {item.label}
                    </Link>
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
                    <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-foreground">
                      {contact.phone}
                    </a>
                  </li>
                ) : null}
                {contact.email ? (
                  <li className="flex items-start gap-2">
                    <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <a href={`mailto:${contact.email}`} className="hover:text-foreground break-all">
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
                    <img src={link.iconSrc} alt="" className="size-5" width={20} height={20} />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {officialLogos.length > 0 ? (
          <div className="border-border/60 border-t pt-6">
            <h2 className="text-muted-foreground mb-4 text-center text-xs font-semibold tracking-wide uppercase">
              Sorteos avalados
            </h2>
            <ul className="flex flex-wrap items-center justify-center gap-6">
              {officialLogos.map((logo, index) => (
                <li key={`${logo.image}-${index}`}>
                  <img
                    src={logo.image}
                    alt={logo.alt || "Logo oficial"}
                    className="h-12 w-auto max-w-[120px] object-contain opacity-90"
                    loading="lazy"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-muted-foreground border-border/60 border-t pt-6 text-center text-xs">
          © {new Date().getFullYear()}
          {siteInfo.site_name ? ` ${siteInfo.site_name}.` : ""} Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
