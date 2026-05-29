import {
  ContactInfoSchema,
  SeoConfigSchema,
  SiteColorsSchema,
  SiteImagesSchema,
  SiteInfoSchema,
  SocialMediaSchema,
} from "@raffle/shared/site-config"
import { z } from "zod"
import { normalizeHeroConfig, normalizeSeoConfig, normalizeSiteImages } from "@/stores/site-config"
import type { PublicSiteConfigPayload } from "@/features/layout/public-queries"

const HeroConfigRawSchema = z
  .object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    main_text: z.string().optional(),
    accent_text: z.string().optional(),
    show_particles: z.boolean().optional(),
  })
  .passthrough()

export const PublicSiteConfigPayloadSchema = z.object({
  site_colors: SiteColorsSchema.optional(),
  site_info: SiteInfoSchema.optional(),
  contact_info: ContactInfoSchema.optional(),
  social_media: SocialMediaSchema.optional(),
  hero_config: HeroConfigRawSchema.optional(),
  site_images: SiteImagesSchema.optional(),
  seo_config: SeoConfigSchema.optional(),
})

export function parsePublicSiteConfig(data: Record<string, unknown>): PublicSiteConfigPayload {
  const parsed = PublicSiteConfigPayloadSchema.safeParse(data)
  if (!parsed.success) return {}

  const hero = parsed.data.hero_config
  return {
    site_colors: parsed.data.site_colors,
    site_info: parsed.data.site_info,
    contact_info: parsed.data.contact_info,
    social_media: parsed.data.social_media,
    site_images: parsed.data.site_images
      ? normalizeSiteImages(parsed.data.site_images)
      : data.site_images
        ? normalizeSiteImages(data.site_images)
        : undefined,
    hero_config: hero ? normalizeHeroConfig(hero) : undefined,
    seo_config: parsed.data.seo_config ? normalizeSeoConfig(parsed.data.seo_config) : undefined,
  }
}
