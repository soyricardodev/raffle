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
  return value ? { ...value } : { banner: "", logo: "" }
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
    images: cloneImages(payload.site_images),
    colors: payload.site_colors ? { ...payload.site_colors } : undefined,
    seo: payload.seo_config ? normalizeSeoConfig(payload.seo_config) : cloneSeo(),
  }
}

/**
 * Branding for public pages — SSR loader context first (no Zustand defaults).
 */
export function usePublicBranding(): PublicBranding | null {
  const fromLayout = usePublicSiteConfigFromLayout()
  const hasLayoutConfig = fromLayout != null

  const { data } = useQuery({
    ...publicSiteConfigQueryOptions(),
    enabled: !hasLayoutConfig,
    initialData: fromLayout ?? undefined,
    staleTime: 300_000,
    refetchOnMount: false,
  })

  const payload = hasLayoutConfig ? fromLayout : (data ?? null)

  return useMemo(() => resolvePublicBranding(payload), [payload])
}
