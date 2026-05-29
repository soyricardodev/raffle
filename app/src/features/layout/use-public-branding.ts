import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import {
  publicSiteConfigQueryOptions,
  type PublicSiteConfigPayload,
} from "@/features/layout/public-queries"
import { usePublicSiteConfigFromLayout } from "@/features/layout/public-site-config-context"
import {
  normalizeHeroConfig,
  normalizeSeoConfig,
  normalizeSiteImages,
  type ContactInfo,
  type HeroConfig,
  type SeoConfig,
  type SiteColors,
  type SiteImages,
  type SiteInfo,
  type SocialMedia,
} from "@/stores/site-config"

function cloneSiteInfo(value?: SiteInfo): SiteInfo {
  return value ? { ...value } : { site_name: "", tagline: "" }
}

function cloneHero(value?: HeroConfig): HeroConfig {
  return value ? { ...value } : { title: "", subtitle: "", show_particles: false }
}

function cloneContact(value?: ContactInfo): ContactInfo {
  return value ? { ...value } : { phone: "", email: "", address: "" }
}

function cloneSocial(value?: SocialMedia): SocialMedia {
  return value ? { ...value } : { whatsapp: "", instagram: "", facebook: "" }
}

function cloneImages(value?: SiteImages): SiteImages {
  return value
    ? {
        ...value,
        official_logos: value.official_logos.map((logo) => ({ ...logo })),
      }
    : normalizeSiteImages(undefined)
}

function cloneSeo(value?: SeoConfig): SeoConfig {
  return value ? { ...value } : normalizeSeoConfig(undefined)
}

export type PublicBranding = {
  payload: PublicSiteConfigPayload
  siteInfo: SiteInfo
  hero: HeroConfig
  contact: ContactInfo
  social: SocialMedia
  images: SiteImages
  colors: SiteColors | undefined
  seo: SeoConfig
}

export function resolvePublicBranding(
  payload: PublicSiteConfigPayload | null | undefined,
): PublicBranding | null {
  if (!payload) return null

  return {
    payload,
    siteInfo: cloneSiteInfo(payload.site_info),
    hero: payload.hero_config ? normalizeHeroConfig(payload.hero_config) : cloneHero(),
    contact: cloneContact(payload.contact_info),
    social: cloneSocial(payload.social_media),
    images: payload.site_images ? normalizeSiteImages(payload.site_images) : cloneImages(),
    colors: payload.site_colors ? { ...payload.site_colors } : undefined,
    seo: payload.seo_config ? normalizeSeoConfig(payload.seo_config) : cloneSeo(),
  }
}

/**
 * Branding for public pages — React Query is source of truth; loader data seeds initial cache.
 */
export function usePublicBranding(): PublicBranding | null {
  const fromLayout = usePublicSiteConfigFromLayout()

  const { data } = useQuery({
    ...publicSiteConfigQueryOptions(),
    initialData: fromLayout ?? undefined,
    staleTime: 300_000,
    refetchOnMount: true,
  })

  const payload = data ?? fromLayout ?? null

  return useMemo(() => resolvePublicBranding(payload), [payload])
}
