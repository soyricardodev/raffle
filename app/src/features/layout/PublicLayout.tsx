import { useEffect } from "react"
import { useInAppBrowserRedirect } from "@/hooks/useInAppBrowserRedirect"
import { useSiteConfig } from "@/stores/site-config"
import { PublicFooter } from "./PublicFooter"
import { PublicHeader } from "./PublicHeader"
import { WhatsAppFab } from "./WhatsAppFab"

type PublicLayoutProps = {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  useInAppBrowserRedirect()
  const loaded = useSiteConfig((state) => state.loaded)
  const setFromApi = useSiteConfig((state) => state.setFromApi)
  const applyCssVariables = useSiteConfig((state) => state.applyCssVariables)

  useEffect(() => {
    applyCssVariables()
  }, [applyCssVariables])

  useEffect(() => {
    if (loaded) return

    let cancelled = false

    fetch("/api/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setFromApi({
          site_colors: data.site_colors,
          site_info: data.site_info,
          contact_info: data.contact_info,
          social_media: data.social_media,
          hero_config: data.hero_config,
          site_images: data.site_images,
        })
      })
      .catch(() => {
        // Defaults del store
      })

    return () => {
      cancelled = true
    }
  }, [loaded, setFromApi])

  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <WhatsAppFab />
    </div>
  )
}
