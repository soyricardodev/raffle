import type { PublicSiteConfigPayload } from "@/features/layout/public-queries"
import { PWA_NAME } from "@/features/pwa/pwa-brand"
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
  const tagline = config?.site_info?.tagline?.trim() ?? ""
  const banner = config?.site_images?.banner?.trim() ?? ""
  const logo = config?.site_images?.logo?.trim() ?? ""

  return {
    title: seo.meta_title || PWA_NAME,
    description: seo.meta_description || tagline,
    ogImage: seo.og_image || banner || logo,
    canonicalUrl: seo.canonical_url,
    indexable: seo.indexable,
  }
}
