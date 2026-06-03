import type { SocialMedia } from "@/stores/site-config"

export function whatsAppHref(digits: string): string {
  const normalized = digits.replace(/\D/g, "")
  return normalized ? `https://wa.me/${normalized}` : ""
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

export type SocialLink = {
  id: "whatsapp" | "instagram" | "facebook"
  label: string
  href: string
  iconSrc: string
}

export function buildSocialLinks(social: SocialMedia): SocialLink[] {
  const links: SocialLink[] = []

  const wa = whatsAppHref(social.whatsapp)
  if (wa) {
    links.push({
      id: "whatsapp",
      label: "WhatsApp",
      href: wa,
      iconSrc: "/brand/social/whatsapp.svg",
    })
  }

  const ig = instagramHref(social.instagram)
  if (ig) {
    links.push({
      id: "instagram",
      label: "Instagram",
      href: ig,
      iconSrc: "/brand/social/instagram.svg",
    })
  }

  const fb = facebookHref(social.facebook)
  if (fb) {
    links.push({
      id: "facebook",
      label: "Facebook",
      href: fb,
      iconSrc: "/brand/social/facebook.svg",
    })
  }

  return links
}
