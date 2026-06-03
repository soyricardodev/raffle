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
  const promoEnabled = normalized.enabled
  const hasConfiguredPromo = promoEnabled && isFirstPurchase
  const whatsappChannelHrefResolved = promoEnabled
    ? whatsAppChannelHref(normalized.whatsapp_channel_url)
    : ""
  const instagramHrefResolved =
    (promoEnabled ? instagramHref(normalized.instagram_url) : "") || instagramHref(social.instagram)
  const tiktokHrefResolved =
    (promoEnabled ? tiktokHref(normalized.tiktok_url) : "") || tiktokHref(social.tiktok)

  const whatsappFinalizeHref =
    hasConfiguredPromo && purchase
      ? whatsAppHrefWithText(
          social.whatsapp,
          buildPurchaseFinalizeWhatsAppMessage({
            customerName: purchase.customerName,
            raffleName: purchase.raffleName,
            ticketCount: purchase.ticketCount,
          }),
        )
      : ""

  const socialLinks = buildSocialLinks(social)

  const hasSocialContent = Boolean(socialLinks.length > 0 || instagramHrefResolved || tiktokHrefResolved)
  const hasFirstPurchaseContent = Boolean(
    hasConfiguredPromo &&
      (title || description || whatsappFinalizeHref || whatsappChannelHrefResolved),
  )

  return {
    shouldShow: hasFirstPurchaseContent || hasSocialContent,
    title: hasConfiguredPromo ? title : "",
    description: hasConfiguredPromo ? description : "",
    whatsappFinalizeHref,
    whatsappChannelHref: hasConfiguredPromo ? whatsappChannelHrefResolved : "",
    instagramHref: instagramHrefResolved,
    tiktokHref: tiktokHrefResolved,
    socialLinks,
  }
}
