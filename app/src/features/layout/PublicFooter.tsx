import { useSiteConfig } from "@/stores/site-config"

export function PublicFooter() {
  const { siteInfo, contact } = useSiteConfig()

  return (
    <footer className="border-border/80 bg-muted/30 mt-auto border-t">
      <div className="container mx-auto grid gap-2 px-4 py-8 text-sm">
        <p className="font-medium">{siteInfo.site_name}</p>
        <p className="text-muted-foreground">{siteInfo.tagline}</p>
        {contact.phone ? <p className="text-muted-foreground">Tel: {contact.phone}</p> : null}
        {contact.email ? <p className="text-muted-foreground">{contact.email}</p> : null}
      </div>
    </footer>
  )
}
