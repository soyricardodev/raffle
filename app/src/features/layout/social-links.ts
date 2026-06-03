import type { SocialMedia } from "@/stores/site-config"

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

export type PurchaseFinalizeWhatsAppInput = {
  customerName: string
  raffleName: string
  ticketCount: number
}

export function buildPurchaseFinalizeWhatsAppMessage(input: PurchaseFinalizeWhatsAppInput): string {
  const name = input.customerName.trim() || "comprador"
  const raffle = input.raffleName.trim() || "la rifa"
  const count = input.ticketCount
  const ticketLabel = count === 1 ? "1 boleto" : `${count} boletos`
  return `Hola, soy ${name}. Para finalizar mi compra, compré ${ticketLabel} de la rifa "${raffle}". Te escribo para que me guardes en WhatsApp y confirmes mis datos.`
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
    iconSrc: "/brand/social/whatsapp.svg",
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
