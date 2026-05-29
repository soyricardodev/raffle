import { z } from "zod"

export const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

export const HexColorSchema = z
  .string()
  .trim()
  .regex(HEX_COLOR, "Color inválido (usa formato #RRGGBB)")

export const SiteInfoSchema = z.object({
  site_name: z.string().trim().max(120),
  tagline: z.string().trim().max(200),
})

export const SiteColorsSchema = z.object({
  primary: HexColorSchema,
  secondary: HexColorSchema,
  accent: HexColorSchema,
})

export const ContactInfoSchema = z.object({
  phone: z.string().trim().max(40),
  email: z.string().trim().max(120),
  address: z.string().trim().max(200),
})

export const SocialMediaSchema = z.object({
  whatsapp: z.string().trim().max(20),
  instagram: z.string().trim().max(200),
  facebook: z.string().trim().max(200),
})

export const HeroConfigSchema = z.object({
  title: z.string().trim().max(120),
  subtitle: z.string().trim().max(200),
  show_particles: z.boolean(),
})

export const OfficialFooterLogoSchema = z.object({
  image: z.string().trim().max(500),
  alt: z.string().trim().max(120),
})

export const SiteImagesSchema = z.object({
  banner: z.string().trim().max(500).default(""),
  logo: z.string().trim().max(500).default(""),
  footer_logo: z.string().trim().max(500).default(""),
  official_logos: z.array(OfficialFooterLogoSchema).max(8).default([]),
})

export const SeoConfigSchema = z.object({
  meta_title: z.string().trim().max(70),
  meta_description: z.string().trim().max(160),
  og_image: z.string().trim().max(500),
  canonical_url: z.union([z.literal(""), z.string().trim().url("URL canónica inválida")]),
  indexable: z.boolean(),
})

export const AdminSiteConfigPatchSchema = z.object({
  site_info: SiteInfoSchema.optional(),
  site_colors: SiteColorsSchema.optional(),
  contact_info: ContactInfoSchema.optional(),
  social_media: SocialMediaSchema.optional(),
  hero_config: HeroConfigSchema.optional(),
  site_images: SiteImagesSchema.optional(),
  seo_config: SeoConfigSchema.optional(),
})

export type SiteInfo = z.infer<typeof SiteInfoSchema>
export type SiteColors = z.infer<typeof SiteColorsSchema>
export type ContactInfo = z.infer<typeof ContactInfoSchema>
export type SocialMedia = z.infer<typeof SocialMediaSchema>
export type HeroConfig = z.infer<typeof HeroConfigSchema>
export type OfficialFooterLogo = z.infer<typeof OfficialFooterLogoSchema>
export type SiteImages = z.infer<typeof SiteImagesSchema>
export type SeoConfig = z.infer<typeof SeoConfigSchema>
export type AdminSiteConfigPatch = z.infer<typeof AdminSiteConfigPatchSchema>

export const SITE_CONFIG_PUBLIC_KEYS = [
  "site_info",
  "site_colors",
  "site_images",
  "social_media",
  "contact_info",
  "hero_config",
  "seo_config",
] as const

export type SiteConfigPublicKey = (typeof SITE_CONFIG_PUBLIC_KEYS)[number]
