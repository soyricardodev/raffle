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

describe("resolvePurchaseSuccessPromo", () => {
  it("hides when disabled even on first purchase", () => {
    const result = resolvePurchaseSuccessPromo({
      promo: {
        enabled: false,
        title: "Únete",
        description: "Dinámicas",
        whatsapp_channel_url: "https://whatsapp.com/channel/abc",
        instagram_url: "@rifas",
        tiktok_url: "@rifas",
      },
      social: { whatsapp: "584121234567", instagram: "", facebook: "", tiktok: "", telegram: "" },
      purchase: firstPurchase,
    })
    expect(result.shouldShow).toBe(false)
  })

  it("hides on repeat purchase even when enabled", () => {
    const result = resolvePurchaseSuccessPromo({
      promo: {
        enabled: true,
        title: "Únete",
        description: "",
        whatsapp_channel_url: "",
        instagram_url: "@rifas",
        tiktok_url: "",
      },
      social: { whatsapp: "584121234567", instagram: "", facebook: "", tiktok: "", telegram: "" },
      purchase: repeatPurchase,
    })
    expect(result.shouldShow).toBe(false)
    expect(result.whatsappFinalizeHref).toBe("")
  })

  it("builds finalize WhatsApp link on first purchase", () => {
    const result = resolvePurchaseSuccessPromo({
      promo: {
        enabled: true,
        title: "",
        description: "",
        whatsapp_channel_url: "",
        instagram_url: "",
        tiktok_url: "",
      },
      social: { whatsapp: "584121234567", instagram: "", facebook: "", tiktok: "", telegram: "" },
      purchase: firstPurchase,
    })
    expect(result.shouldShow).toBe(true)
    expect(result.whatsappFinalizeHref).toContain("https://wa.me/584121234567")
    expect(result.whatsappFinalizeHref).toContain(encodeURIComponent("María Pérez"))
    expect(result.whatsappFinalizeHref).toContain(encodeURIComponent("Rifa Oro"))
    expect(result.whatsappFinalizeHref).toContain(encodeURIComponent("2 boletos"))
  })

  it("includes social links and promo instagram on first purchase", () => {
    const result = resolvePurchaseSuccessPromo({
      promo: {
        enabled: true,
        title: "Únete a mi comunidad",
        description: "",
        whatsapp_channel_url: "",
        instagram_url: "@promo",
        tiktok_url: "@promotiktok",
      },
      social: {
        whatsapp: "584121234567",
        instagram: "@global",
        facebook: "",
        tiktok: "@globaltiktok",
        telegram: "",
      },
      purchase: firstPurchase,
    })
    expect(result.shouldShow).toBe(true)
    expect(result.instagramHref).toBe("https://instagram.com/promo")
    expect(result.tiktokHref).toBe("https://www.tiktok.com/@promotiktok")
    expect(result.socialLinks.map((l) => l.id)).toContain("whatsapp")
    expect(result.socialLinks.map((l) => l.id)).toContain("instagram")
    expect(result.socialLinks.map((l) => l.id)).toContain("tiktok")
  })
})
