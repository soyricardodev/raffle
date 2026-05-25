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

type SiteConfigState = {
  colors: SiteColors
  siteInfo: SiteInfo
  contact: ContactInfo
  loaded: boolean
  applyCssVariables: () => void
  setFromApi: (
    payload: Partial<{
      site_colors: SiteColors
      site_info: SiteInfo
      contact_info: ContactInfo
    }>,
  ) => void
}

const defaults: Pick<SiteConfigState, "colors" | "siteInfo" | "contact"> = {
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
      loaded: true,
    }))
    applyThemeColors(get().colors)
  },
}))
