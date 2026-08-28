import { describe, expect, it } from "vitest"
import { resolvePurchaseSuccessPromo } from "@/features/raffle/purchase-form/resolve-purchase-success-promo"
import type { PurchaseResult } from "@/features/raffle/types"

const firstPurchase: PurchaseResult = {
  purchaseId: 1,
  ticketNumbers: ["001", "002"],
  isFirstPurchase: true,
  customerName: "María Pérez",
  raffleName: "Rifa Oro",
  ticketCount: 2,
}

const repeatPurchase: PurchaseResult = {
  ...firstPurchase,
  purchaseId: 2,
  isFirstPurchase: false,
}

const emptyPromo = {
  enabled: false,
  title: "Únete",
  description: "Dinámicas",
  whatsapp_channel_url: "https://whatsapp.com/channel/abc",
  telegram_channel_url: "https://t.me/yoiberrifascanal",
  instagram_url: "@rifas",
  tiktok_url: "@rifas",
}

describe("resolvePurchaseSuccessPromo", () => {
  it("shows global social links even when promo is disabled", () => {
    const result = resolvePurchaseSuccessPromo({
      promo: emptyPromo,
      social: {
        whatsapp: "584121234567",
        instagram: "",
        facebook: "",
        tiktok: "",
        telegram: "yoiberifas",
        support_channel: "telegram",
      },
      purchase: firstPurchase,
    })
    expect(result.shouldShow).toBe(true)
    expect(result.supportFinalizeHref).toBe("")
    expect(result.socialLinks.map((l) => l.id)).toContain("telegram")
    expect(result.socialLinks.map((l) => l.id)).toContain("whatsapp")
    expect(result.supportChannelHref).toBe("https://whatsapp.com/channel/abc")
  })

  it("hides when promo is disabled and there are no global socials", () => {
    const result = resolvePurchaseSuccessPromo({
      promo: {
        ...emptyPromo,
        whatsapp_channel_url: "",
        telegram_channel_url: "",
        instagram_url: "",
        tiktok_url: "",
      },
      social: {
        whatsapp: "",
        instagram: "",
        facebook: "",
        tiktok: "",
        telegram: "",
        support_channel: "telegram",
      },
      purchase: firstPurchase,
    })
    expect(result.shouldShow).toBe(false)
  })

  it("keeps social links visible on repeat purchase without finalization", () => {
    const result = resolvePurchaseSuccessPromo({
      promo: {
        ...emptyPromo,
        enabled: true,
        description: "",
        whatsapp_channel_url: "",
        telegram_channel_url: "",
        tiktok_url: "",
      },
      social: {
        whatsapp: "584121234567",
        instagram: "",
        facebook: "",
        tiktok: "",
        telegram: "yoiberifas",
        support_channel: "telegram",
      },
      purchase: repeatPurchase,
    })
    expect(result.shouldShow).toBe(true)
    expect(result.supportFinalizeHref).toBe("")
    expect(result.socialLinks.map((l) => l.id)).toContain("telegram")
    expect(result.socialLinks.map((l) => l.id)).toContain("whatsapp")
  })

  it("builds finalize Telegram link on first purchase", () => {
    const result = resolvePurchaseSuccessPromo({
      promo: {
        enabled: true,
        title: "",
        description: "",
        whatsapp_channel_url: "",
        telegram_channel_url: "",
        instagram_url: "",
        tiktok_url: "",
      },
      social: {
        whatsapp: "584121234567",
        instagram: "",
        facebook: "",
        tiktok: "",
        telegram: "yoiberifas",
        support_channel: "telegram",
      },
      purchase: firstPurchase,
    })
    expect(result.shouldShow).toBe(true)
    expect(result.supportKind).toBe("telegram")
    expect(result.supportFinalizeHref).toContain("https://t.me/yoiberifas")
    expect(result.supportFinalizeHref).toContain(encodeURIComponent("María Pérez"))
    expect(result.supportFinalizeHref).toContain(encodeURIComponent("Rifa Oro"))
    expect(result.supportFinalizeHref).toContain(encodeURIComponent("2 boletos"))
    expect(result.supportChannelHref).toBe("")
    expect(result.socialLinks.map((l) => l.id)).toContain("telegram")
  })

  it("builds finalize WhatsApp link when WhatsApp is enabled", () => {
    const result = resolvePurchaseSuccessPromo({
      promo: {
        enabled: true,
        title: "",
        description: "",
        whatsapp_channel_url: "",
        telegram_channel_url: "",
        instagram_url: "",
        tiktok_url: "",
      },
      social: {
        whatsapp: "584121234567",
        instagram: "",
        facebook: "",
        tiktok: "",
        telegram: "yoiberifas",
        support_channel: "whatsapp",
      },
      purchase: firstPurchase,
      whatsappEnabled: true,
    })
    expect(result.supportKind).toBe("whatsapp")
    expect(result.supportFinalizeHref).toContain("https://wa.me/584121234567")
  })

  it("prefers the WhatsApp channel and keeps Telegram in the tickets drawer", () => {
    const result = resolvePurchaseSuccessPromo({
      promo: {
        enabled: true,
        title: "",
        description: "",
        whatsapp_channel_url: "https://whatsapp.com/channel/abc",
        telegram_channel_url: "https://t.me/yoiberrifascanal",
        instagram_url: "",
        tiktok_url: "",
      },
      social: {
        whatsapp: "584121234567",
        instagram: "@rifas",
        facebook: "",
        tiktok: "",
        telegram: "yoiberifas",
        support_channel: "telegram",
      },
      purchase: firstPurchase,
    })

    expect(result.supportChannelHref).toBe("https://whatsapp.com/channel/abc")
    expect(result.socialLinks.map((l) => l.id)).toEqual(["whatsapp", "instagram", "telegram"])
    expect(result.socialLinks.find((l) => l.id === "whatsapp")?.href).toBe(
      "https://whatsapp.com/channel/abc",
    )
  })

  it("includes social links and promo instagram on first purchase", () => {
    const result = resolvePurchaseSuccessPromo({
      promo: {
        enabled: true,
        title: "Únete a mi comunidad",
        description: "",
        whatsapp_channel_url: "",
        telegram_channel_url: "",
        instagram_url: "@promo",
        tiktok_url: "@promotiktok",
      },
      social: {
        whatsapp: "584121234567",
        instagram: "@global",
        facebook: "",
        tiktok: "@globaltiktok",
        telegram: "yoiberifas",
        support_channel: "telegram",
      },
      purchase: firstPurchase,
    })
    expect(result.shouldShow).toBe(true)
    expect(result.instagramHref).toBe("https://instagram.com/promo")
    expect(result.tiktokHref).toBe("https://www.tiktok.com/@promotiktok")
    expect(result.socialLinks.map((l) => l.id)).toContain("telegram")
    expect(result.socialLinks.map((l) => l.id)).toContain("instagram")
    expect(result.socialLinks.map((l) => l.id)).toContain("tiktok")
  })
})
