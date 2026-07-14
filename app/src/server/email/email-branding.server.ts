import {
  ContactInfoSchema,
  SiteColorsSchema,
  SiteInfoSchema,
  SocialMediaSchema,
  type ContactInfo,
  type SiteColors,
  type SiteInfo,
} from "@raffle/shared/site-config"
import { getEnv } from "@/lib/env"
import { normalizeSiteImages } from "@/stores/site-config"
import { getSiteConfigMap } from "../site-config.service"
import { toAbsoluteAssetUrl } from "./email-html"

export type EmailBrandingContext = {
  appUrl: string
  siteName: string
  tagline: string
  colors: SiteColors
  logoUrl: string | null
  contact: ContactInfo
  /** Digits-only WhatsApp from site social config (for wa.me links). */
  whatsapp: string
}

const DEFAULT_COLORS: SiteColors = {
  primary: "#8B7355",
  secondary: "#F5F5DC",
  accent: "#FFD700",
}

const DEFAULT_SITE_INFO: SiteInfo = {
  site_name: "Rifas Premium",
  tagline: "Tu oportunidad de ganar",
  runlot_id: "",
}

const DEFAULT_CONTACT: ContactInfo = {
  phone: "",
  email: "",
  address: "",
}

const DEFAULT_WHATSAPP = ""

let brandingCache: { value: EmailBrandingContext; expiresAt: number } | null = null
const BRANDING_CACHE_MS = 60_000

function parseSiteColors(raw: unknown): SiteColors {
  const parsed = SiteColorsSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_COLORS
}

function parseSiteInfo(raw: unknown): SiteInfo {
  const parsed = SiteInfoSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_SITE_INFO
}

function parseContactInfo(raw: unknown): ContactInfo {
  const parsed = ContactInfoSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_CONTACT
}

function parseWhatsapp(raw: unknown): string {
  const parsed = SocialMediaSchema.safeParse(raw)
  if (!parsed.success) return DEFAULT_WHATSAPP
  return parsed.data.whatsapp.replace(/\D/g, "")
}

export async function loadEmailBranding(): Promise<EmailBrandingContext> {
  const now = Date.now()
  if (brandingCache && brandingCache.expiresAt > now) {
    return brandingCache.value
  }

  const appUrl = getEnv().APP_URL
  const config = await getSiteConfigMap()
  const colors = parseSiteColors(config.site_colors)
  const siteInfo = parseSiteInfo(config.site_info)
  const contact = parseContactInfo(config.contact_info)
  const whatsapp = parseWhatsapp(config.social_media)
  const images = normalizeSiteImages(config.site_images)
  const logoPath = images.logo.trim() || images.footer_logo.trim()

  const value: EmailBrandingContext = {
    appUrl,
    siteName: siteInfo.site_name || DEFAULT_SITE_INFO.site_name,
    tagline: siteInfo.tagline || DEFAULT_SITE_INFO.tagline,
    colors,
    logoUrl: toAbsoluteAssetUrl(logoPath, appUrl),
    contact,
    whatsapp,
  }

  brandingCache = { value, expiresAt: now + BRANDING_CACHE_MS }
  return value
}

/** Clears in-memory branding cache (for tests). */
export function clearEmailBrandingCache(): void {
  brandingCache = null
}
