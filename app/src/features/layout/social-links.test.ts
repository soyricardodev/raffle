import { describe, expect, it } from "vitest"
import {
  buildSocialLinks,
  facebookHref,
  instagramHref,
  whatsAppHref,
} from "@/features/layout/social-links"

describe("social-links", () => {
  it("builds WhatsApp wa.me link", () => {
    expect(whatsAppHref("584121234567")).toBe("https://wa.me/584121234567")
  })

  it("normalizes Instagram handle to URL", () => {
    expect(instagramHref("@rifas")).toBe("https://instagram.com/rifas")
    expect(instagramHref("https://instagram.com/page")).toBe("https://instagram.com/page")
  })

  it("normalizes Facebook page to URL", () => {
    expect(facebookHref("https://facebook.com/page")).toBe("https://facebook.com/page")
  })

  it("builds social link list from config", () => {
    const links = buildSocialLinks({
      whatsapp: "584121234567",
      instagram: "@rifas",
      facebook: "https://facebook.com/rifas",
    })
    expect(links).toHaveLength(3)
    expect(links.map((l) => l.id)).toEqual(["whatsapp", "instagram", "facebook"])
  })
})
