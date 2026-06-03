import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type AdminSiteConfigDraft,
  draftToPublicPayload,
} from "@/features/admin/config/admin-site-config"
import { resolvePublicSeo } from "@/features/layout/public-seo"
import { resolvePublicBranding } from "@/features/layout/use-public-branding"
import { cn } from "@/lib/utils"

type SitePreviewCardProps = {
  draft: AdminSiteConfigDraft
  className?: string
}

export function SitePreviewCard({ draft, className }: SitePreviewCardProps) {
  const branding = resolvePublicBranding(draftToPublicPayload(draft))
  if (!branding) return null

  const seo = resolvePublicSeo(branding.payload)
  const colors = branding.colors ?? {
    primary: draft.primary,
    secondary: draft.secondary,
    accent: draft.accent,
  }
  const banner = branding.images.banner.trim()
  const logo = branding.images.logo.trim()
  const siteName = branding.siteInfo.site_name.trim() || "Tu sitio"

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Vista previa</CardTitle>
        <CardDescription>Así verán tu sitio los visitantes (sin guardar aún).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wide uppercase">
            Google / redes
          </p>
          <p className="text-[#1a0dab] text-sm leading-snug dark:text-[#8ab4f8]">
            {seo.title || siteName}
          </p>
          <p className="text-[#006621] truncate text-xs dark:text-[#81c995]">
            {seo.canonicalUrl || "tusitio.com"}
          </p>
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {seo.description || "Descripción del sitio…"}
          </p>
        </div>

        <div
          className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[1.25rem] border shadow-sm"
          style={
            {
              "--brand-primary": colors.primary,
              "--brand-secondary": colors.secondary,
              "--brand-accent": colors.accent,
            } as React.CSSProperties
          }
        >
          <div className="bg-background flex h-9 items-center justify-between border-b px-3">
            <div className="flex min-w-0 items-center gap-1.5">
              {logo ? (
                <img src={logo} alt="" className="size-6 shrink-0 rounded object-contain" />
              ) : (
                <span
                  className="size-6 shrink-0 rounded"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                  aria-hidden
                />
              )}
              <span className="truncate text-xs font-semibold">{siteName}</span>
            </div>
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: "var(--brand-accent)" }}
              aria-hidden
            />
          </div>

          {banner ? (
            <img src={banner} alt="" className="aspect-[16/9] w-full object-cover" />
          ) : (
            <div
              className="aspect-[16/9] w-full"
              style={{
                background: `linear-gradient(135deg, var(--brand-secondary), var(--brand-primary))`,
              }}
            />
          )}

          <div className="flex flex-col gap-2 p-3">
            <div
              className="rounded-lg px-3 py-2 text-center text-[11px] font-semibold text-white"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              Ir a comprar
            </div>
            <div className="bg-muted/50 h-14 rounded-lg" aria-hidden />
          </div>

          <div className="border-t px-3 py-2">
            <p className="truncate text-[10px] font-medium">{siteName}</p>
            <p className="text-muted-foreground truncate text-[10px]">
              {branding.contact.phone || branding.contact.email || "Contacto"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["primary", "secondary", "accent"] as const).map((key) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <span
                className="size-4 rounded border"
                style={{ backgroundColor: colors[key] }}
                aria-hidden
              />
              <span className="text-muted-foreground capitalize">{key}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
