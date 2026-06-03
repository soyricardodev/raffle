import { describe, expect, it } from "vitest"
import { resolvePurchaseSuccessPromo } from "@/features/raffle/purchase-form/resolve-purchase-success-promo"

describe("resolvePurchaseSuccessPromo", () => {
  it("hides when disabled even with content", () => {
    const result = resolvePurchaseSuccessPromo({
      enabled: false,
      title: "Únete",
      description: "Dinámicas",
      whatsapp_channel_url: "https://whatsapp.com/channel/abc",
      instagram_url: "@rifas",
    })
    expect(result.shouldShow).toBe(false)
  })

  it("shows when enabled and at least one field is useful", () => {
    const result = resolvePurchaseSuccessPromo({
      enabled: true,
      title: "Únete a mi comunidad",
      description: "",
      whatsapp_channel_url: "",
      instagram_url: "@rifas",
    })
    expect(result.shouldShow).toBe(true)
    expect(result.instagramHref).toBe("https://instagram.com/rifas")
  })
})
