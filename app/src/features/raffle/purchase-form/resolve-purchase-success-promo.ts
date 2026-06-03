import { instagramHref, whatsAppChannelHref } from "@/features/layout/social-links"
import type { PurchaseSuccessPromo } from "@/stores/site-config"

export type ResolvedPurchaseSuccessPromo = {
  shouldShow: boolean
  title: string
  description: string
  whatsappHref: string
  instagramHref: string
}

export function resolvePurchaseSuccessPromo(
  promo: PurchaseSuccessPromo | undefined,
): ResolvedPurchaseSuccessPromo {
  const normalized = promo ?? {
    enabled: false,
    title: "",
    description: "",
    whatsapp_channel_url: "",
    instagram_url: "",
  }

  const title = normalized.title.trim()
  const description = normalized.description.trim()
  const whatsappHref = whatsAppChannelHref(normalized.whatsapp_channel_url)
  const instagramHrefResolved = instagramHref(normalized.instagram_url)

  const hasContent = Boolean(title || description || whatsappHref || instagramHrefResolved)

  return {
    shouldShow: normalized.enabled && hasContent,
    title,
    description,
    whatsappHref,
    instagramHref: instagramHrefResolved,
  }
}
