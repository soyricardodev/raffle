import { describe, expect, it } from "vitest"
import {
  buildPurchaseFinalizeSupportMessage,
  buildPurchaseFinalizeWhatsAppMessage,
  buildSocialLinks,
  facebookHref,
  formatWhatsAppDisplayNumber,
  instagramHref,
  resolveBroadcastChannelLinks,
  resolveSupportChannel,
  telegramHref,
  telegramHrefWithText,
  tiktokHref,
  whatsAppChannelHref,
  whatsAppHref,
  whatsAppHrefWithText,
} from "@/features/layout/social-links"

describe("social-links", () => {
  it("builds WhatsApp wa.me link", () => {
    expect(whatsAppHref("584121234567")).toBe("https://wa.me/584121234567")
  })

  it("builds WhatsApp link with prefilled text", () => {
    const href = whatsAppHrefWithText("584121234567", "Hola, soy Ana")
    expect(href).toBe(`https://wa.me/584121234567?text=${encodeURIComponent("Hola, soy Ana")}`)
  })

  it("builds purchase finalize message", () => {
    const message = buildPurchaseFinalizeSupportMessage({
      customerName: "Ana López",
      raffleName: "Gran Rifa",
      ticketCount: 3,
      channelLabel: "Telegram",
    })
    expect(message).toContain("Ana López")
    expect(message).toContain("Gran Rifa")
    expect(message).toContain("3 boletos")
    expect(message).toContain("Telegram")
    expect(
      buildPurchaseFinalizeWhatsAppMessage({
        customerName: "Ana López",
        raffleName: "Gran Rifa",
        ticketCount: 3,
      }),
    ).toContain("WhatsApp")
  })

  it("builds Telegram link with prefilled text", () => {
    const href = telegramHrefWithText("yoiberifas", "Hola, soy Ana")
    expect(href).toBe(`https://t.me/yoiberifas?text=${encodeURIComponent("Hola, soy Ana")}`)
  })

  it("resolves Telegram by default and WhatsApp when enabled", () => {
    const telegram = resolveSupportChannel({
      whatsappEnabled: false,
      social: { telegram: "", whatsapp: "584121234567" },
    })
    expect(telegram.kind).toBe("telegram")
    expect(telegram.supportHref).toBe("https://t.me/yoiberifas")
    expect(telegram.channelHref).toBe("https://t.me/yoiberrifascanal")

    const ignored = resolveSupportChannel({
      whatsappEnabled: true,
      social: { telegram: "yoiberifas", whatsapp: "584121234567", support_channel: "telegram" },
    })
    expect(ignored.kind).toBe("telegram")

    const whatsapp = resolveSupportChannel({
      whatsappEnabled: true,
      social: { telegram: "yoiberifas", whatsapp: "584121234567", support_channel: "whatsapp" },
    })
    expect(whatsapp.kind).toBe("whatsapp")
    expect(whatsapp.supportHref).toBe("https://wa.me/584121234567")
  })

  it("keeps WhatsApp channel invite URLs intact", () => {
    expect(whatsAppChannelHref("https://whatsapp.com/channel/abc")).toBe(
      "https://whatsapp.com/channel/abc",
    )
    expect(whatsAppChannelHref("584121234567")).toBe("")
  })

  it("normalizes Instagram handle to URL", () => {
    expect(instagramHref("@rifas")).toBe("https://instagram.com/rifas")
    expect(instagramHref("https://instagram.com/page")).toBe("https://instagram.com/page")
  })

  it("normalizes Facebook page to URL", () => {
    expect(facebookHref("https://facebook.com/page")).toBe("https://facebook.com/page")
  })

  it("normalizes TikTok and Telegram handles to URLs", () => {
    expect(tiktokHref("@rifas")).toBe("https://www.tiktok.com/@rifas")
    expect(telegramHref("@rifas")).toBe("https://t.me/rifas")
  })

  it("builds social link list from config", () => {
    const links = buildSocialLinks({
      whatsapp: "584121234567",
      instagram: "@rifas",
      facebook: "https://facebook.com/rifas",
      tiktok: "@rifas",
      telegram: "rifas",
    })
    expect(links).toHaveLength(5)
    expect(links.map((l) => l.id)).toEqual([
      "whatsapp",
      "instagram",
      "facebook",
      "tiktok",
      "telegram",
    ])
    expect(links.find((l) => l.id === "instagram")?.iconSrc).toBe("/brand/social/instagram.svg")
    expect(links.find((l) => l.id === "facebook")?.iconSrc).toBe("/brand/social/facebook.svg")
    expect(links.find((l) => l.id === "tiktok")?.iconSrc).toBe("/brand/social/tiktok.svg")
    expect(links.find((l) => l.id === "telegram")?.iconSrc).toBe("/brand/social/telegram.svg")
  })

  it("uses WhatsApp channel URL when provided for banner-style links", () => {
    const links = buildSocialLinks(
      {
        whatsapp: "584121234567",
        instagram: "@rifas",
      },
      { whatsappChannelUrl: "https://whatsapp.com/channel/abc" },
    )

    expect(links.find((l) => l.id === "whatsapp")?.href).toBe("https://whatsapp.com/channel/abc")
  })

  it("omits WhatsApp when channel URL is requested but empty", () => {
    const links = buildSocialLinks(
      { whatsapp: "584121234567", instagram: "@rifas" },
      { whatsappChannelUrl: "" },
    )

    expect(links.map((l) => l.id)).toEqual(["instagram"])
  })

  it("uses Telegram channel URL when provided for follow links", () => {
    const links = buildSocialLinks(
      { telegram: "yoiberifas", instagram: "@rifas" },
      { telegramChannelUrl: "https://t.me/yoiberrifascanal" },
    )

    expect(links.find((l) => l.id === "telegram")?.href).toBe("https://t.me/yoiberrifascanal")
  })

  it("formats Venezuelan WhatsApp numbers for display", () => {
    expect(formatWhatsAppDisplayNumber("584248781707")).toBe("+58 424 878 1707")
  })

  it("resolves broadcast channels independently from support", () => {
    const links = resolveBroadcastChannelLinks({
      social: {
        whatsapp: "584248781707",
        instagram: "@rifas",
        telegram: "yoiberifas",
        support_channel: "whatsapp",
      },
      promo: {
        whatsapp_channel_url: "https://whatsapp.com/channel/abc",
        telegram_channel_url: "https://t.me/yoiberrifascanal",
        instagram_url: "",
      },
    })

    expect(links.map((link) => link.id)).toEqual(["whatsapp", "telegram", "instagram"])
    expect(links[0]?.href).toBe("https://whatsapp.com/channel/abc")
    expect(links[1]?.href).toBe("https://t.me/yoiberrifascanal")
    expect(links[2]?.href).toBe("https://instagram.com/rifas")
  })

  it("includes future social links when they are configured as URLs", () => {
    const links = buildSocialLinks({
      youtube: "https://youtube.com/@rifas",
    })

    expect(links).toEqual([
      {
        id: "youtube",
        label: "Youtube",
        href: "https://youtube.com/@rifas",
      },
    ])
  })
})
