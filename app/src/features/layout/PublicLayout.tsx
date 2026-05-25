import { useEffect } from "react"
import { useSiteConfig } from "@/stores/site-config"
import { PublicFooter } from "./PublicFooter"
import { PublicHeader } from "./PublicHeader"

type PublicLayoutProps = {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
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
    </div>
  )
}
