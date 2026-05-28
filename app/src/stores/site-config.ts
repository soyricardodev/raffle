import { create } from "zustand"
import type {
  ContactInfo,
  HeroConfig,
  SeoConfig,
  SiteColors,
  SiteImages,
  SiteInfo,
  SocialMedia,
} from "@raffle/shared/site-config"

export type { ContactInfo, HeroConfig, SeoConfig, SiteColors, SiteImages, SiteInfo, SocialMedia }

/** Legacy hero_config used main_text/accent_text; v2 uses title/subtitle. */
export function normalizeHeroConfig(raw: unknown): HeroConfig {
  if (!raw || typeof raw !== "object") {
    return { title: "", subtitle: "", show_particles: false }
  }
  const hero = raw as Record<string, unknown>
  return {
    title: String(hero.title ?? hero.main_text ?? ""),
    subtitle: String(hero.subtitle ?? hero.accent_text ?? ""),
    show_particles: Boolean(hero.show_particles),
  }
}

export function normalizeSeoConfig(raw: unknown): SeoConfig {
  if (!raw || typeof raw !== "object") {
    return {
      meta_title: "",
      meta_description: "",
      og_image: "",
      canonical_url: "",
      indexable: true,
    }
  }
  const seo = raw as Record<string, unknown>
  return {
    meta_title: String(seo.meta_title ?? ""),
    meta_description: String(seo.meta_description ?? ""),
    og_image: String(seo.og_image ?? ""),
    canonical_url: String(seo.canonical_url ?? ""),
    indexable: seo.indexable !== false,
  }
}

type SiteConfigState = {
  colors: SiteColors
  siteInfo: SiteInfo
  contact: ContactInfo
  social: SocialMedia
  hero: HeroConfig
  images: SiteImages
  seo: SeoConfig
  loaded: boolean
  applyCssVariables: () => void
  setFromApi: (
    payload: Partial<{
      site_colors: SiteColors
      site_info: SiteInfo
      contact_info: ContactInfo
      social_media: SocialMedia
      hero_config: HeroConfig
      site_images: SiteImages
      seo_config: SeoConfig
    }>,
  ) => void
}

const defaults: Pick<
  SiteConfigState,
  "colors" | "siteInfo" | "contact" | "social" | "hero" | "images" | "seo"
> = {
  colors: {
    primary: "#8B7355",
    secondary: "#F5F5DC",
    accent: "#FFD700",
  },
  siteInfo: {
    site_name: "Rifas",
    tagline: "Tu oportunidad de ganar",
  },
  contact: {
    phone: "",
    email: "",
    address: "",
  },
  social: {
    whatsapp: "",
    instagram: "",
    facebook: "",
  },
  hero: {
    title: "",
    subtitle: "",
    show_particles: false,
  },
  images: {
    banner: "",
    logo: "",
  },
  seo: {
    meta_title: "",
    meta_description: "",
    og_image: "",
    canonical_url: "",
    indexable: true,
  },
}

function applyThemeColors(colors: SiteColors) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.style.setProperty("--brand-primary", colors.primary)
  root.style.setProperty("--brand-secondary", colors.secondary)
  root.style.setProperty("--brand-accent", colors.accent)
}

export const useSiteConfig = create<SiteConfigState>((set, get) => ({
  ...defaults,
  loaded: false,
  applyCssVariables: () => applyThemeColors(get().colors),
  setFromApi: (payload) => {
    set((state) => ({
      colors: payload.site_colors ?? state.colors,
      siteInfo: payload.site_info ?? state.siteInfo,
      contact: payload.contact_info ?? state.contact,
      social: payload.social_media ?? state.social,
      hero: payload.hero_config ? normalizeHeroConfig(payload.hero_config) : state.hero,
      images: payload.site_images ?? state.images,
      seo: payload.seo_config ? normalizeSeoConfig(payload.seo_config) : state.seo,
      loaded: true,
    }))
    applyThemeColors(get().colors)
  },
}))
