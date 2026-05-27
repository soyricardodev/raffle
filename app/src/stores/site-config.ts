import { create } from "zustand"

export type SiteColors = {
  primary: string
  secondary: string
  accent: string
}

export type SiteInfo = {
  site_name: string
  tagline: string
}

export type ContactInfo = {
  phone: string
  email: string
  address: string
}

export type SocialMedia = {
  whatsapp: string
  instagram: string
  facebook: string
}

export type HeroConfig = {
  title: string
  subtitle: string
  show_particles: boolean
}

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

export type SiteImages = {
  banner: string
  logo: string
}

type SiteConfigState = {
  colors: SiteColors
  siteInfo: SiteInfo
  contact: ContactInfo
  social: SocialMedia
  hero: HeroConfig
  images: SiteImages
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
    }>,
  ) => void
}

const defaults: Pick<
  SiteConfigState,
  "colors" | "siteInfo" | "contact" | "social" | "hero" | "images"
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
      loaded: true,
    }))
    applyThemeColors(get().colors)
  },
}))
