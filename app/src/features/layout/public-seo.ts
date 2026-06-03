import type { PublicSiteConfigPayload } from "@/features/layout/public-queries"
import { normalizeSeoConfig } from "@/stores/site-config"

export type ResolvedPublicSeo = {
  title: string
  description: string
  ogImage: string
  canonicalUrl: string
  indexable: boolean
}

export function resolvePublicSeo(
  config: PublicSiteConfigPayload | null | undefined,
): ResolvedPublicSeo {
  const seo = normalizeSeoConfig(config?.seo_config)
  const siteName = config?.site_info?.site_name?.trim() ?? ""
  const tagline = config?.site_info?.tagline?.trim() ?? ""
  const banner = config?.site_images?.banner?.trim() ?? ""
  const logo = config?.site_images?.logo?.trim() ?? ""

  return {
    title: seo.meta_title || siteName,
    description: seo.meta_description || tagline,
    ogImage: seo.og_image || banner || logo,
    canonicalUrl: seo.canonical_url,
    indexable: seo.indexable,
  }
}
