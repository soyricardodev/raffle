import {
  ContactInfoSchema,
  PurchaseSuccessPromoSchema,
  SeoConfigSchema,
  SiteColorsSchema,
  SiteImagesSchema,
  SiteInfoSchema,
  SocialMediaSchema,
} from "@raffle/shared/site-config"
import { z } from "zod"
import type { PublicSiteConfigPayload } from "@/features/layout/public-queries"
import {
  DEFAULT_TELEGRAM_CHANNEL_URL,
  DEFAULT_TELEGRAM_SUPPORT,
} from "@/features/layout/social-links"
import {
  normalizeHeroConfig,
  normalizePurchaseSuccessPromo,
  normalizeSeoConfig,
  normalizeSiteImages,
} from "@/stores/site-config"

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
  purchase_success_promo: PurchaseSuccessPromoSchema.optional(),
  features: z
    .object({
      whatsapp_enabled: z.boolean(),
      venezuela_municipality_enabled: z.boolean().optional(),
    })
    .optional(),
})

function normalizeParsedField<T>(
  parsed: T | undefined,
  raw: unknown,
  normalize: (value: unknown) => T,
): T | undefined {
  if (parsed !== undefined) return normalize(parsed)
  if (raw !== undefined) return normalize(raw)
  return undefined
}

export function parsePublicSiteConfig(data: Record<string, unknown>): PublicSiteConfigPayload {
  const parsed = PublicSiteConfigPayloadSchema.safeParse(data)
  if (!parsed.success) return {}

  const hero = parsed.data.hero_config
  return {
    site_colors: parsed.data.site_colors,
    site_info: parsed.data.site_info,
    contact_info: parsed.data.contact_info,
    social_media: parsed.data.social_media,
    site_images: normalizeParsedField(
      parsed.data.site_images,
      data.site_images,
      normalizeSiteImages,
    ),
    hero_config: hero ? normalizeHeroConfig(hero) : undefined,
    seo_config: parsed.data.seo_config ? normalizeSeoConfig(parsed.data.seo_config) : undefined,
    purchase_success_promo: normalizeParsedField(
      parsed.data.purchase_success_promo,
      data.purchase_success_promo,
      normalizePurchaseSuccessPromo,
    ),
    features: parsed.data.features,
  }
}

export function applyPublicWhatsAppVisibility(
  payload: PublicSiteConfigPayload,
  whatsappEnabled: boolean,
  venezuelaMunicipalityEnabled = false,
): PublicSiteConfigPayload {
  const social = payload.social_media ?? {
    whatsapp: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    telegram: "",
    support_channel: "telegram" as const,
  }

  const promo = payload.purchase_success_promo
  const useWhatsApp = whatsappEnabled && social.support_channel === "whatsapp"

  return {
    ...payload,
    social_media: {
      ...social,
      whatsapp: useWhatsApp ? social.whatsapp : "",
      telegram: social.telegram.trim() || DEFAULT_TELEGRAM_SUPPORT,
      support_channel: useWhatsApp ? "whatsapp" : "telegram",
    },
    purchase_success_promo: promo
      ? {
          ...promo,
          whatsapp_channel_url: useWhatsApp ? promo.whatsapp_channel_url : "",
          telegram_channel_url: promo.telegram_channel_url.trim() || DEFAULT_TELEGRAM_CHANNEL_URL,
        }
      : promo,
    features: {
      whatsapp_enabled: whatsappEnabled,
      venezuela_municipality_enabled: venezuelaMunicipalityEnabled,
    },
  }
}
