import {
  buildPurchaseFinalizeSupportMessage,
  buildSocialLinks,
  instagramHref,
  resolveSupportChannel,
  type SocialLink,
  type SupportChannelKind,
  tiktokHref,
  whatsAppChannelHref,
} from "@/features/layout/social-links"
import type { PurchaseResult } from "@/features/raffle/types"
import type { PurchaseSuccessPromo, SocialMedia } from "@/stores/site-config"

export type ResolvedPurchaseSuccessPromo = {
  shouldShow: boolean
  title: string
  description: string
  supportKind: SupportChannelKind
  supportLabel: string
  supportIconSrc: string
  supportBrandColor: string
  supportFinalizeHref: string
  supportChannelHref: string
  instagramHref: string
  tiktokHref: string
  socialLinks: SocialLink[]
}

export type ResolvePurchaseSuccessPromoInput = {
  promo: PurchaseSuccessPromo | undefined
  social: SocialMedia | undefined
  purchase: PurchaseResult | null
  whatsappEnabled?: boolean
}

export function resolvePurchaseSuccessPromo(
  input: ResolvePurchaseSuccessPromoInput,
): ResolvedPurchaseSuccessPromo {
  const normalized = input.promo ?? {
    enabled: false,
    title: "",
    description: "",
    whatsapp_channel_url: "",
    telegram_channel_url: "",
    instagram_url: "",
    tiktok_url: "",
  }

  const social = input.social ?? {
    whatsapp: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    telegram: "",
    support_channel: "telegram",
  }

  const purchase = input.purchase
  const isFirstPurchase = purchase?.isFirstPurchase ?? false

  const title = normalized.title.trim()
  const description = normalized.description.trim()
  const promoEnabled = normalized.enabled
  const hasConfiguredPromo = promoEnabled && isFirstPurchase
  const support = resolveSupportChannel({
    whatsappEnabled: input.whatsappEnabled ?? false,
    social,
    promo: normalized,
  })
  const instagramHrefResolved =
    (promoEnabled ? instagramHref(normalized.instagram_url) : "") || instagramHref(social.instagram)
  const tiktokHrefResolved =
    (promoEnabled ? tiktokHref(normalized.tiktok_url) : "") || tiktokHref(social.tiktok)

  const supportFinalizeHref =
    hasConfiguredPromo && purchase
      ? support.supportHrefWithText(
          buildPurchaseFinalizeSupportMessage({
            customerName: purchase.customerName,
            raffleName: purchase.raffleName,
            ticketCount: purchase.ticketCount,
            channelLabel: support.label,
          }),
        )
      : ""

  const whatsappChannelHrefResolved = whatsAppChannelHref(normalized.whatsapp_channel_url)
  const supportChannelHref = whatsappChannelHrefResolved
  const socialLinks = buildSocialLinks(social, {
    whatsappChannelUrl: whatsappChannelHrefResolved || undefined,
  }).filter((link) => link.id !== "telegram")

  const hasSocialContent = Boolean(
    socialLinks.length > 0 ||
      instagramHrefResolved ||
      tiktokHrefResolved ||
      supportChannelHref,
  )
  const hasFirstPurchaseContent = Boolean(
    hasConfiguredPromo &&
      (title || description || supportFinalizeHref || supportChannelHref),
  )

  return {
    shouldShow: hasFirstPurchaseContent || hasSocialContent,
    title: hasConfiguredPromo ? title : "",
    description: hasConfiguredPromo ? description : "",
    supportKind: support.kind,
    supportLabel: support.label,
    supportIconSrc: support.iconSrc,
    supportBrandColor: support.brandColor,
    supportFinalizeHref,
    supportChannelHref,
    instagramHref: instagramHrefResolved,
    tiktokHref: tiktokHrefResolved,
    socialLinks,
  }
}
