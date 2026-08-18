import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import {
  applyPublicWhatsAppVisibility,
  parsePublicSiteConfig,
} from "@/features/layout/public-site-config-schema"
import { getEnv } from "@/lib/env"
import { getSiteConfigMap } from "@/server/site-config.service"
import type {
  ContactInfo,
  HeroConfig,
  PurchaseSuccessPromo,
  SeoConfig,
  SiteColors,
  SiteImages,
  SiteInfo,
  SocialMedia,
} from "@/stores/site-config"

export const publicQueryKeys = {
  siteConfig: ["public", "site-config"] as const,
}

export type PublicSiteConfigPayload = {
  site_colors?: SiteColors
  site_info?: SiteInfo
  contact_info?: ContactInfo
  social_media?: SocialMedia
  hero_config?: HeroConfig
  site_images?: SiteImages
  seo_config?: SeoConfig
  purchase_success_promo?: PurchaseSuccessPromo
  features?: { whatsapp_enabled: boolean; venezuela_municipality_enabled?: boolean }
}

export const fetchPublicSiteConfig = createServerFn({ method: "GET" }).handler(async () => {
  const data = await getSiteConfigMap()
  return applyPublicWhatsAppVisibility(
    parsePublicSiteConfig(data),
    getEnv().ENABLE_WHATSAPP,
    getEnv().ENABLE_VENEZUELA_MUNICIPALITY,
  )
})

export function publicSiteConfigQueryOptions() {
  return queryOptions({
    queryKey: publicQueryKeys.siteConfig,
    queryFn: () => fetchPublicSiteConfig(),
    staleTime: 300_000,
  })
}
