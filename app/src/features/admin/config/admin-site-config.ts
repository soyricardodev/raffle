import {
  type AdminSiteConfigPatch,
  AdminSiteConfigPatchSchema,
  type EmailSettings,
  type OfficialFooterLogo,
  type PurchaseSuccessPromo,
  normalizeEmailSettings,
} from "@raffle/shared/site-config"
import {
  normalizeHeroConfig,
  normalizePurchaseSuccessPromo,
  normalizeSeoConfig,
  normalizeSiteImages,
} from "@/stores/site-config"

export type AdminSiteConfigDraft = {
  site_name: string
  tagline: string
  runlot_id: string
  primary: string
  secondary: string
  accent: string
  phone: string
  email: string
  address: string
  whatsapp: string
  instagram: string
  facebook: string
  tiktok: string
  telegram: string
  hero_title: string
  hero_subtitle: string
  show_particles: boolean
  banner: string
  logo: string
  footer_logo: string
  official_logos: OfficialFooterLogo[]
  meta_title: string
  meta_description: string
  og_image: string
  canonical_url: string
  indexable: boolean
  purchase_success_promo: PurchaseSuccessPromo
  email_settings: EmailSettings
}

export const defaultAdminSiteConfigDraft = (): AdminSiteConfigDraft => ({
  site_name: "",
  tagline: "",
  runlot_id: "",
  primary: "#8B7355",
  secondary: "#F5F5DC",
  accent: "#FFD700",
  phone: "",
  email: "",
  address: "",
  whatsapp: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  telegram: "",
  hero_title: "",
  hero_subtitle: "",
  show_particles: false,
  banner: "",
  logo: "",
  footer_logo: "",
  official_logos: [],
  meta_title: "",
  meta_description: "",
  og_image: "",
  canonical_url: "",
  indexable: true,
  purchase_success_promo: normalizePurchaseSuccessPromo(undefined),
  email_settings: normalizeEmailSettings(undefined),
})

export function apiToDraft(data: Record<string, unknown> | undefined): AdminSiteConfigDraft {
  const base = defaultAdminSiteConfigDraft()
  if (!data) return base

  const hero = normalizeHeroConfig(data.hero_config)
  const seo = normalizeSeoConfig(data.seo_config)
  const siteInfo = data.site_info as Record<string, unknown> | undefined
  const colors = data.site_colors as Record<string, unknown> | undefined
  const contact = data.contact_info as Record<string, unknown> | undefined
  const social = data.social_media as Record<string, unknown> | undefined
  const images = normalizeSiteImages(data.site_images)

  return {
    site_name: String(siteInfo?.site_name ?? base.site_name),
    tagline: String(siteInfo?.tagline ?? base.tagline),
    runlot_id: String(siteInfo?.runlot_id ?? base.runlot_id),
    primary: String(colors?.primary ?? base.primary),
    secondary: String(colors?.secondary ?? base.secondary),
    accent: String(colors?.accent ?? base.accent),
    phone: String(contact?.phone ?? base.phone),
    email: String(contact?.email ?? base.email),
    address: String(contact?.address ?? base.address),
    whatsapp: String(social?.whatsapp ?? base.whatsapp),
    instagram: String(social?.instagram ?? base.instagram),
    facebook: String(social?.facebook ?? base.facebook),
    tiktok: String(social?.tiktok ?? base.tiktok),
    telegram: String(social?.telegram ?? base.telegram),
    hero_title: hero.title,
    hero_subtitle: hero.subtitle,
    show_particles: hero.show_particles,
    banner: images.banner || base.banner,
    logo: images.logo || base.logo,
    footer_logo: images.footer_logo || base.footer_logo,
    official_logos: images.official_logos.length > 0 ? images.official_logos : base.official_logos,
    meta_title: seo.meta_title,
    meta_description: seo.meta_description,
    og_image: seo.og_image,
    canonical_url: seo.canonical_url,
    indexable: seo.indexable,
    purchase_success_promo: normalizePurchaseSuccessPromo(data.purchase_success_promo),
    email_settings: normalizeEmailSettings(data.email_settings),
  }
}

function trimPurchaseSuccessPromo(promo: PurchaseSuccessPromo): PurchaseSuccessPromo {
  return {
    enabled: promo.enabled,
    title: promo.title.trim(),
    description: promo.description.trim(),
    whatsapp_channel_url: promo.whatsapp_channel_url.trim(),
    instagram_url: promo.instagram_url.trim(),
    tiktok_url: promo.tiktok_url.trim(),
  }
}

export function draftToPatch(draft: AdminSiteConfigDraft): AdminSiteConfigPatch {
  return {
    site_info: {
      site_name: draft.site_name.trim(),
      tagline: draft.tagline.trim(),
      runlot_id: draft.runlot_id.trim(),
    },
    site_colors: {
      primary: draft.primary.trim(),
      secondary: draft.secondary.trim(),
      accent: draft.accent.trim(),
    },
    contact_info: {
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      address: draft.address.trim(),
    },
    social_media: {
      whatsapp: draft.whatsapp.replace(/\D/g, ""),
      instagram: draft.instagram.trim(),
      facebook: draft.facebook.trim(),
      tiktok: draft.tiktok.trim(),
      telegram: draft.telegram.trim(),
    },
    hero_config: {
      title: draft.hero_title.trim(),
      subtitle: draft.hero_subtitle.trim(),
      show_particles: draft.show_particles,
    },
    site_images: {
      banner: draft.banner.trim(),
      logo: draft.logo.trim(),
      footer_logo: draft.footer_logo.trim(),
      official_logos: draft.official_logos
        .map((logo) => ({
          image: logo.image.trim(),
          alt: logo.alt.trim(),
        }))
        .filter((logo) => logo.image.length > 0),
    },
    seo_config: {
      meta_title: draft.meta_title.trim(),
      meta_description: draft.meta_description.trim(),
      og_image: draft.og_image.trim(),
      canonical_url: draft.canonical_url.trim(),
      indexable: draft.indexable,
    },
    purchase_success_promo: trimPurchaseSuccessPromo(draft.purchase_success_promo),
    email_settings: {
      enabled: draft.email_settings.enabled,
      from_name: draft.email_settings.from_name.trim(),
      from_email: draft.email_settings.from_email.trim(),
      reply_to: draft.email_settings.reply_to.trim(),
      send_confirmation: draft.email_settings.send_confirmation,
      send_status_updates: draft.email_settings.send_status_updates,
      send_modifications: draft.email_settings.send_modifications,
    },
  }
}

export type DraftValidationResult =
  | { ok: true; patch: AdminSiteConfigPatch }
  | { ok: false; fieldErrors: Record<string, string> }

export function validateDraft(draft: AdminSiteConfigDraft): DraftValidationResult {
  const patch = draftToPatch(draft)
  const parsed = AdminSiteConfigPatchSchema.safeParse(patch)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".")
      if (!fieldErrors[path]) fieldErrors[path] = issue.message
    }
    return { ok: false, fieldErrors }
  }

  if (patch.contact_info?.email && patch.contact_info.email.length > 0) {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.contact_info.email)
    if (!emailOk) {
      return { ok: false, fieldErrors: { "contact_info.email": "Email inválido" } }
    }
  }

  if (patch.email_settings?.enabled && !patch.email_settings.from_email) {
    return {
      ok: false,
      fieldErrors: {
        "email_settings.from_email": "Indica el email del remitente para enviar correos",
      },
    }
  }

  return { ok: true, patch: parsed.data }
}

export function draftsEqual(a: AdminSiteConfigDraft, b: AdminSiteConfigDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function draftToPublicPayload(draft: AdminSiteConfigDraft) {
  const patch = draftToPatch(draft)
  return {
    site_info: patch.site_info,
    site_colors: patch.site_colors,
    contact_info: patch.contact_info,
    social_media: patch.social_media,
    hero_config: patch.hero_config,
    site_images: patch.site_images,
    seo_config: patch.seo_config,
    purchase_success_promo: patch.purchase_success_promo,
  }
}
