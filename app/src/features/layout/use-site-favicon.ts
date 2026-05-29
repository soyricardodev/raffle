import { useEffect } from "react"
import { usePublicBranding } from "@/features/layout/use-public-branding"

function upsertLink(rel: string, href: string) {
  const selector = `link[rel="${rel}"]`
  let link = document.querySelector<HTMLLinkElement>(selector)
  if (!link) {
    link = document.createElement("link")
    link.rel = rel
    document.head.appendChild(link)
  }
  link.href = href
}

/** Keeps document favicon in sync when public site config updates client-side. */
export function useSiteFavicon() {
  const branding = usePublicBranding()
  const favicon = branding?.images.logo.trim() ?? ""

  useEffect(() => {
    if (!favicon) return
    upsertLink("icon", favicon)
    upsertLink("apple-touch-icon", favicon)
  }, [favicon])
}
