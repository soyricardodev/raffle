import type { PublicSiteConfigPayload } from "@/features/layout/public-queries"
import { normalizeSiteImages } from "@/stores/site-config"

/** Site logo used as favicon / apple-touch-icon. */
export function resolveSiteFaviconUrl(config: PublicSiteConfigPayload | null | undefined): string {
  if (!config?.site_images) return ""
  const images = normalizeSiteImages(config.site_images)
  return images.logo.trim()
}
