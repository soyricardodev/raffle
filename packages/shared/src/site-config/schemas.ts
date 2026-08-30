import { z } from "zod"

export const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

export const HexColorSchema = z
  .string()
  .trim()
  .regex(HEX_COLOR, "Color inválido (usa formato #RRGGBB)")

export const SiteInfoSchema = z.object({
  site_name: z.string().trim().max(120),
  tagline: z.string().trim().max(200),
  /** RUNLOT authorization id for raffle sales (shown in footer when set). */
  runlot_id: z.string().trim().max(60).default(""),
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

export const SupportChannelSchema = z.enum(["telegram", "whatsapp"])

export function normalizeSupportChannel(raw: unknown): "telegram" | "whatsapp" {
  return raw === "whatsapp" ? "whatsapp" : "telegram"
}

export const SocialMediaSchema = z.object({
  whatsapp: z.string().trim().max(20),
  instagram: z.string().trim().max(200),
  facebook: z.string().trim().max(200),
  tiktok: z.string().trim().max(200).default(""),
  telegram: z.string().trim().max(200).default(""),
  /** Public support channel. WhatsApp also requires ENABLE_WHATSAPP. */
  support_channel: SupportChannelSchema.default("telegram"),
})

export const DEFAULT_HOW_TO_PLAY_LABEL = "Aprende a jugar aquí"

export const HeroConfigSchema = z.object({
  title: z.string().trim().max(120),
  subtitle: z.string().trim().max(200),
  show_particles: z.boolean(),
  /** Public how-to-play CTA. Empty = DEFAULT_HOW_TO_PLAY_LABEL. */
  how_to_play_label: z.string().trim().max(80).default(""),
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

const httpsUrlOrEmpty = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .url("URL inválida")
    .refine((v) => /^https:\/\//i.test(v), {
      message: "Debe empezar con https://",
    }),
])

/** Promo block shown in the post-purchase success drawer (mobile-first). */
export const PurchaseSuccessPromoSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().trim().max(120).default(""),
  description: z.string().trim().max(300).default(""),
  /** Full WhatsApp channel/community invite URL (not wa.me digits). */
  whatsapp_channel_url: httpsUrlOrEmpty.default(""),
  /** Full Telegram channel/community invite URL. */
  telegram_channel_url: httpsUrlOrEmpty.default(""),
  /** Instagram handle or profile URL for community/promo. */
  instagram_url: z.string().trim().max(200).default(""),
  /** TikTok handle or profile URL for community/promo. */
  tiktok_url: z.string().trim().max(200).default(""),
})

/** Default quick-reject reasons shown in admin and rejection dialog when unset. */
export const DEFAULT_PURCHASE_REJECT_REASONS = [
  "Pago duplicado",
  "Referencia no compatible con la imagen",
  "Imagen de pago no corresponde a lo que se espera",
  "Comprobante ilegible o incompleto",
  "Monto del pago no coincide con la compra",
  "Pago no recibido o no verificado en el banco",
] as const

export const DUPLICATE_PAYMENT_REASON = DEFAULT_PURCHASE_REJECT_REASONS[0]

/** Admin-only: editable quick-reject reason texts (max matches purchase status notes). */
export const PurchaseRejectReasonsSchema = z
  .array(z.string().trim().min(1, "El motivo no puede estar vacío").max(500, "Máximo 500 caracteres"))
  .min(1, "Agrega al menos un motivo")
  .max(20, "Máximo 20 motivos")

export function normalizePurchaseRejectReasons(raw: unknown): string[] {
  const parsed = PurchaseRejectReasonsSchema.safeParse(raw)
  if (parsed.success && parsed.data.length > 0) {
    return parsed.data
  }
  return [...DEFAULT_PURCHASE_REJECT_REASONS]
}

export function findDuplicatePurchaseRejectReasonIndex(reasons: string[]): number {
  const seen = new Set<string>()
  for (let i = 0; i < reasons.length; i++) {
    const key = reasons[i]!.trim()
    if (seen.has(key)) return i
    seen.add(key)
  }
  return -1
}

/** Admin-only: transactional email sender and automation toggles. */
export const EmailSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  from_name: z.string().trim().max(100).default(""),
  from_email: z.union([z.literal(""), z.string().trim().email("Email del remitente inválido")]).default(""),
  reply_to: z.union([z.literal(""), z.string().trim().email("Reply-to inválido")]).default(""),
  send_confirmation: z.boolean().default(true),
  send_status_updates: z.boolean().default(true),
  send_modifications: z.boolean().default(true),
})

export const AdminSiteConfigPatchSchema = z.object({
  site_info: SiteInfoSchema.optional(),
  site_colors: SiteColorsSchema.optional(),
  contact_info: ContactInfoSchema.optional(),
  social_media: SocialMediaSchema.optional(),
  hero_config: HeroConfigSchema.optional(),
  site_images: SiteImagesSchema.optional(),
  seo_config: SeoConfigSchema.optional(),
  purchase_success_promo: PurchaseSuccessPromoSchema.optional(),
  email_settings: EmailSettingsSchema.optional(),
  purchase_reject_reasons: PurchaseRejectReasonsSchema.optional(),
})

export type SiteInfo = z.infer<typeof SiteInfoSchema>
export type SiteColors = z.infer<typeof SiteColorsSchema>
export type ContactInfo = z.infer<typeof ContactInfoSchema>
export type SocialMedia = z.infer<typeof SocialMediaSchema>
export type HeroConfig = z.infer<typeof HeroConfigSchema>
export type OfficialFooterLogo = z.infer<typeof OfficialFooterLogoSchema>
export type SiteImages = z.infer<typeof SiteImagesSchema>
export type SeoConfig = z.infer<typeof SeoConfigSchema>
export type PurchaseSuccessPromo = z.infer<typeof PurchaseSuccessPromoSchema>
export type EmailSettings = z.infer<typeof EmailSettingsSchema>
export type AdminSiteConfigPatch = z.infer<typeof AdminSiteConfigPatchSchema>

const ONBOARDING_FALLBACK_EMAIL = "onboarding@resend.dev"

export function normalizeEmailSettings(raw: unknown): EmailSettings {
  return EmailSettingsSchema.parse(raw ?? {})
}

export function isUsableSenderEmail(email: string | undefined): boolean {
  const trimmed = email?.trim()
  if (!trimmed || !trimmed.includes("@")) return false
  return trimmed.toLowerCase() !== ONBOARDING_FALLBACK_EMAIL
}

export const SITE_CONFIG_PUBLIC_KEYS = [
  "site_info",
  "site_colors",
  "site_images",
  "social_media",
  "contact_info",
  "hero_config",
  "seo_config",
  "purchase_success_promo",
] as const

export type SiteConfigPublicKey = (typeof SITE_CONFIG_PUBLIC_KEYS)[number]
