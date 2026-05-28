import { AdminSiteConfigPatchSchema, type AdminSiteConfigPatch } from "@raffle/shared/site-config"
import { normalizeHeroConfig, normalizeSeoConfig } from "@/stores/site-config"

export type AdminSiteConfigDraft = {
  site_name: string
  tagline: string
  primary: string
  secondary: string
  accent: string
  phone: string
  email: string
  address: string
  whatsapp: string
  instagram: string
  facebook: string
  hero_title: string
  hero_subtitle: string
  show_particles: boolean
  banner: string
  logo: string
  meta_title: string
  meta_description: string
  og_image: string
  canonical_url: string
  indexable: boolean
}

export const defaultAdminSiteConfigDraft = (): AdminSiteConfigDraft => ({
  site_name: "",
  tagline: "",
  primary: "#8B7355",
  secondary: "#F5F5DC",
  accent: "#FFD700",
  phone: "",
  email: "",
  address: "",
  whatsapp: "",
  instagram: "",
  facebook: "",
  hero_title: "",
  hero_subtitle: "",
  show_particles: false,
  banner: "",
  logo: "",
  meta_title: "",
  meta_description: "",
  og_image: "",
  canonical_url: "",
  indexable: true,
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
  const images = data.site_images as Record<string, unknown> | undefined

  return {
    site_name: String(siteInfo?.site_name ?? base.site_name),
    tagline: String(siteInfo?.tagline ?? base.tagline),
    primary: String(colors?.primary ?? base.primary),
    secondary: String(colors?.secondary ?? base.secondary),
    accent: String(colors?.accent ?? base.accent),
    phone: String(contact?.phone ?? base.phone),
    email: String(contact?.email ?? base.email),
    address: String(contact?.address ?? base.address),
    whatsapp: String(social?.whatsapp ?? base.whatsapp),
    instagram: String(social?.instagram ?? base.instagram),
    facebook: String(social?.facebook ?? base.facebook),
    hero_title: hero.title,
    hero_subtitle: hero.subtitle,
    show_particles: hero.show_particles,
    banner: String(images?.banner ?? base.banner),
    logo: String(images?.logo ?? base.logo),
    meta_title: seo.meta_title,
    meta_description: seo.meta_description,
    og_image: seo.og_image,
    canonical_url: seo.canonical_url,
    indexable: seo.indexable,
  }
}

export function draftToPatch(draft: AdminSiteConfigDraft): AdminSiteConfigPatch {
  return {
    site_info: { site_name: draft.site_name.trim(), tagline: draft.tagline.trim() },
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
    },
    hero_config: {
      title: draft.hero_title.trim(),
      subtitle: draft.hero_subtitle.trim(),
      show_particles: draft.show_particles,
    },
    site_images: {
      banner: draft.banner.trim(),
      logo: draft.logo.trim(),
    },
    seo_config: {
      meta_title: draft.meta_title.trim(),
      meta_description: draft.meta_description.trim(),
      og_image: draft.og_image.trim(),
      canonical_url: draft.canonical_url.trim(),
      indexable: draft.indexable,
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
  }
}
