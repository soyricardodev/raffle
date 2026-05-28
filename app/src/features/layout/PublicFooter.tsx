import { usePublicBranding } from "@/features/layout/use-public-branding"

export function PublicFooter() {
  const branding = usePublicBranding()

  if (!branding) {
    return <footer className="border-border/80 bg-muted/30 mt-auto border-t" aria-hidden />
  }

  const { siteInfo, contact } = branding

  if (!siteInfo.site_name && !siteInfo.tagline && !contact.phone && !contact.email) {
    return null
  }

  return (
    <footer className="border-border/80 bg-muted/30 mt-auto border-t">
      <div className="container mx-auto grid gap-2 px-4 py-8 text-sm">
        {siteInfo.site_name ? <p className="font-medium">{siteInfo.site_name}</p> : null}
        {siteInfo.tagline ? <p className="text-muted-foreground">{siteInfo.tagline}</p> : null}
        {contact.phone ? <p className="text-muted-foreground">Tel: {contact.phone}</p> : null}
        {contact.email ? <p className="text-muted-foreground">{contact.email}</p> : null}
      </div>
    </footer>
  )
}
