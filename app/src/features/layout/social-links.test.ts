import { describe, expect, it } from "vitest"
import {
  buildPurchaseFinalizeWhatsAppMessage,
  buildSocialLinks,
  facebookHref,
  instagramHref,
  telegramHref,
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
    const message = buildPurchaseFinalizeWhatsAppMessage({
      customerName: "Ana López",
      raffleName: "Gran Rifa",
      ticketCount: 3,
    })
    expect(message).toContain("Ana López")
    expect(message).toContain("Gran Rifa")
    expect(message).toContain("3 boletos")
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
    expect(links.find((l) => l.id === "tiktok")?.iconSrc).toBe("/brand/social/tiktok.svg")
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
