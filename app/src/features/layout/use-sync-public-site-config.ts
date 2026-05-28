import { useLayoutEffect } from "react"
import { usePublicSiteConfigFromLayout } from "@/features/layout/public-site-config-context"
import { useSiteConfig } from "@/stores/site-config"

/** Single Zustand sync for admin/shared utilities; public UI uses `usePublicBranding`. */
export function useSyncPublicSiteConfig() {
  const fromLayout = usePublicSiteConfigFromLayout()
  const setFromApi = useSiteConfig((state) => state.setFromApi)

  useLayoutEffect(() => {
    if (!fromLayout) return
    setFromApi(fromLayout)
  }, [fromLayout, setFromApi])
}
