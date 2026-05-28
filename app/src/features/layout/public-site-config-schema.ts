import { z } from "zod"
import { normalizeHeroConfig } from "@/stores/site-config"
import type { PublicSiteConfigPayload } from "@/features/layout/public-queries"

const SiteColorsSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
})

const SiteInfoSchema = z.object({
  site_name: z.string(),
  tagline: z.string(),
})

const ContactInfoSchema = z.object({
  phone: z.string(),
  email: z.string(),
  address: z.string(),
})

const SocialMediaSchema = z.object({
  whatsapp: z.string(),
  instagram: z.string(),
  facebook: z.string(),
})

const SiteImagesSchema = z.object({
  banner: z.string(),
  logo: z.string(),
})

const HeroConfigSchema = z
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
  hero_config: HeroConfigSchema.optional(),
  site_images: SiteImagesSchema.optional(),
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
    site_images: parsed.data.site_images,
    hero_config: hero ? normalizeHeroConfig(hero) : undefined,
  }
}
