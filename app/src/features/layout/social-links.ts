import type { PurchaseSuccessPromo, SocialMedia } from "@/stores/site-config"

export const DEFAULT_TELEGRAM_SUPPORT = "yoiberifas"
export const DEFAULT_TELEGRAM_CHANNEL_URL = "https://t.me/yoiberrifascanal"

export const TELEGRAM_BRAND_COLOR = "#2AABEE"
export const WHATSAPP_BRAND_COLOR = "#25D366"

export const TELEGRAM_ICON = "/brand/social/telegram.svg"
export const WHATSAPP_ICON = "/brand/social/whatsapp.svg"

export function whatsAppHref(digits: string): string {
  const normalized = digits.replace(/\D/g, "")
  return normalized ? `https://wa.me/${normalized}` : ""
}

export function whatsAppHrefWithText(digits: string, message: string): string {
  const base = whatsAppHref(digits)
  if (!base) return ""
  const text = message.trim()
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}

export type PurchaseFinalizeSupportInput = {
  customerName: string
  raffleName: string
  ticketCount: number
  channelLabel: string
}

export function buildPurchaseFinalizeSupportMessage(input: PurchaseFinalizeSupportInput): string {
  const name = input.customerName.trim() || "comprador"
  const raffle = input.raffleName.trim() || "la rifa"
  const count = input.ticketCount
  const ticketLabel = count === 1 ? "1 boleto" : `${count} boletos`
  const channel = input.channelLabel.trim() || "Telegram"
  return `Hola, soy ${name}. Para finalizar mi compra, compré ${ticketLabel} de la rifa "${raffle}". Te escribo para que me guardes en ${channel} y confirmes mis datos.`
}

/** @deprecated Use buildPurchaseFinalizeSupportMessage with channelLabel. */
export function buildPurchaseFinalizeWhatsAppMessage(
  input: Omit<PurchaseFinalizeSupportInput, "channelLabel">,
): string {
  return buildPurchaseFinalizeSupportMessage({ ...input, channelLabel: "WhatsApp" })
}

/** WhatsApp channel/community invite URL (must already be https). */
export function whatsAppChannelHref(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return ""
}

export function instagramHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const handle = trimmed.replace(/^@/, "")
  return `https://instagram.com/${handle}`
}

export function facebookHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://facebook.com/${trimmed.replace(/^@/, "")}`
}

export function tiktokHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const handle = trimmed.replace(/^@/, "")
  return `https://www.tiktok.com/@${handle}`
}

export function telegramHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const handle = trimmed.replace(/^@/, "")
  return `https://t.me/${handle}`
}

export function telegramHrefWithText(value: string, message: string): string {
  const base = telegramHref(value)
  if (!base) return ""
  const text = message.trim()
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}

export function telegramChannelHref(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return telegramHref(trimmed)
}

function genericSocialHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  return /^https?:\/\//i.test(trimmed) ? trimmed : ""
}

function socialLabel(id: string): string {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

export type SocialLink = {
  id: string
  label: string
  href: string
  iconSrc?: string
}

type SocialLinkDefinition = {
  label: string
  iconSrc?: string
  href: (value: string) => string
}

const SOCIAL_LINK_DEFINITIONS: Record<string, SocialLinkDefinition> = {
  whatsapp: {
    label: "WhatsApp",
    iconSrc: WHATSAPP_ICON,
    href: whatsAppHref,
  },
  instagram: {
    label: "Instagram",
    iconSrc: "/brand/social/instagram.svg",
    href: instagramHref,
  },
  facebook: {
    label: "Facebook",
    iconSrc: "/brand/social/facebook.svg",
    href: facebookHref,
  },
  tiktok: {
    label: "TikTok",
    iconSrc: "/brand/social/tiktok.svg",
    href: tiktokHref,
  },
  telegram: {
    label: "Telegram",
    iconSrc: TELEGRAM_ICON,
    href: telegramHref,
  },
}

export type BuildSocialLinksOptions = {
  /** WhatsApp channel/community invite URL; overrides wa.me from social.whatsapp. */
  whatsappChannelUrl?: string
}

export function buildSocialLinks(
  social: Partial<SocialMedia> | Record<string, unknown>,
  options?: BuildSocialLinksOptions,
): SocialLink[] {
  const links: SocialLink[] = []
  const seen = new Set<string>()
  const socialRecord = social as Record<string, unknown>
  const whatsappChannelHrefResolved = whatsAppChannelHref(options?.whatsappChannelUrl ?? "")

  for (const [id, definition] of Object.entries(SOCIAL_LINK_DEFINITIONS)) {
    const value = String(socialRecord[id] ?? "")
    const href =
      id === "whatsapp" && whatsappChannelHrefResolved
        ? whatsappChannelHrefResolved
        : id === "whatsapp" && options?.whatsappChannelUrl !== undefined
          ? ""
          : definition.href(value)
    seen.add(id)
    if (href) {
      links.push({
        id,
        label: definition.label,
        href,
        iconSrc: definition.iconSrc,
      })
    }
  }

  for (const [id, rawValue] of Object.entries(socialRecord)) {
    if (seen.has(id)) continue
    const href = genericSocialHref(String(rawValue ?? ""))
    if (href) {
      links.push({
        id,
        label: socialLabel(id),
        href,
      })
    }
  }

  return links
}

export type SupportChannelKind = "telegram" | "whatsapp"

export type ResolvedSupportChannel = {
  kind: SupportChannelKind
  label: string
  iconSrc: string
  brandColor: string
  supportHref: string
  supportHrefWithText: (message: string) => string
  channelHref: string
}

export function resolveSupportChannel(input: {
  whatsappEnabled: boolean
  social?: Partial<SocialMedia> | null
  promo?: Partial<PurchaseSuccessPromo> | null
}): ResolvedSupportChannel {
  const whatsappDigits = (input.social?.whatsapp ?? "").replace(/\D/g, "")
  const requestedWhatsApp = input.social?.support_channel === "whatsapp"
  if (input.whatsappEnabled && requestedWhatsApp && whatsappDigits) {
    return {
      kind: "whatsapp",
      label: "WhatsApp",
      iconSrc: WHATSAPP_ICON,
      brandColor: WHATSAPP_BRAND_COLOR,
      supportHref: whatsAppHref(whatsappDigits),
      supportHrefWithText: (message) => whatsAppHrefWithText(whatsappDigits, message),
      channelHref: whatsAppChannelHref(input.promo?.whatsapp_channel_url ?? ""),
    }
  }

  const telegram = (input.social?.telegram ?? "").trim() || DEFAULT_TELEGRAM_SUPPORT
  const channelUrl =
    (input.promo?.telegram_channel_url ?? "").trim() || DEFAULT_TELEGRAM_CHANNEL_URL
  return {
    kind: "telegram",
    label: "Telegram",
    iconSrc: TELEGRAM_ICON,
    brandColor: TELEGRAM_BRAND_COLOR,
    supportHref: telegramHref(telegram),
    supportHrefWithText: (message) => telegramHrefWithText(telegram, message),
    channelHref: telegramChannelHref(channelUrl),
  }
}
