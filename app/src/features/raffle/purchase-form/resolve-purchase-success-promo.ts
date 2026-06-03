import {
  buildSocialLinks,
  instagramHref,
  tiktokHref,
  type SocialLink,
  whatsAppChannelHref,
  whatsAppHrefWithText,
  buildPurchaseFinalizeWhatsAppMessage,
} from "@/features/layout/social-links"
import type { PurchaseResult } from "@/features/raffle/types"
import type { PurchaseSuccessPromo, SocialMedia } from "@/stores/site-config"

export type ResolvedPurchaseSuccessPromo = {
  shouldShow: boolean
  title: string
  description: string
  /** wa.me link with prefilled finalize message (support number). */
  whatsappFinalizeHref: string
  /** Legacy channel invite URL from promo config. */
  whatsappChannelHref: string
  instagramHref: string
  tiktokHref: string
  socialLinks: SocialLink[]
}

export type ResolvePurchaseSuccessPromoInput = {
  promo: PurchaseSuccessPromo | undefined
  social: SocialMedia | undefined
  purchase: PurchaseResult | null
}

export function resolvePurchaseSuccessPromo(
  input: ResolvePurchaseSuccessPromoInput,
): ResolvedPurchaseSuccessPromo {
  const normalized = input.promo ?? {
    enabled: false,
    title: "",
    description: "",
    whatsapp_channel_url: "",
    instagram_url: "",
    tiktok_url: "",
  }

  const social = input.social ?? {
    whatsapp: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    telegram: "",
  }

  const purchase = input.purchase
  const isFirstPurchase = purchase?.isFirstPurchase ?? false

  const title = normalized.title.trim()
  const description = normalized.description.trim()
  const whatsappChannelHrefResolved = whatsAppChannelHref(normalized.whatsapp_channel_url)
  const instagramHrefResolved =
    instagramHref(normalized.instagram_url) || instagramHref(social.instagram)
  const tiktokHrefResolved = tiktokHref(normalized.tiktok_url) || tiktokHref(social.tiktok)

  const whatsappFinalizeHref =
    isFirstPurchase && purchase
      ? whatsAppHrefWithText(
          social.whatsapp,
          buildPurchaseFinalizeWhatsAppMessage({
            customerName: purchase.customerName,
            raffleName: purchase.raffleName,
            ticketCount: purchase.ticketCount,
          }),
        )
      : ""

  const socialLinks = isFirstPurchase ? buildSocialLinks(social) : []

  const hasContent = Boolean(
    title ||
      description ||
      whatsappFinalizeHref ||
      whatsappChannelHrefResolved ||
      instagramHrefResolved ||
      tiktokHrefResolved ||
      socialLinks.length > 0,
  )

  return {
    shouldShow: normalized.enabled && isFirstPurchase && hasContent,
    title,
    description,
    whatsappFinalizeHref,
    whatsappChannelHref: whatsappChannelHrefResolved,
    instagramHref: instagramHrefResolved,
    tiktokHref: tiktokHrefResolved,
    socialLinks,
  }
}
