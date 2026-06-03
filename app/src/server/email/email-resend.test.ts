import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearEmailBrandingCache } from "./email-branding.server"
import { buildResendEmail, parseEmailLogType } from "./email-resend"
import type { PurchaseEmailContext } from "./email-types"

vi.mock("./email-branding.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./email-branding.server")>()
  return {
    ...actual,
    loadEmailBranding: vi.fn(async () => ({
      appUrl: "https://rifas.example.com",
      siteName: "Rifas Test",
      tagline: "",
      colors: { primary: "#8B7355", secondary: "#F5F5DC", accent: "#FFD700" },
      logoUrl: null,
      contact: { phone: "", email: "", address: "" },
    })),
  }
})

describe("email-resend", () => {
  const ctx: PurchaseEmailContext = {
    purchaseId: 1,
    customerName: "Ana",
    customerEmail: "ana@test.com",
    customerPhone: "04141111111",
    ticketQuantity: 2,
    totalAmountCents: 1000,
    paymentMethod: "pago_movil",
    paymentMethodLabel: "Pago móvil",
    raffleName: "Rifa",
    ticketNumbers: ["10", "11"],
  }

  beforeEach(() => {
    clearEmailBrandingCache()
  })

  it("rejects invalid email type", () => {
    expect(parseEmailLogType("not_a_type").ok).toBe(false)
  })

  it("rejects test type for resend", () => {
    expect(parseEmailLogType("test").ok).toBe(false)
  })

  it("builds status update from metadata", async () => {
    const type = parseEmailLogType("status_update")
    expect(type.ok).toBe(true)
    if (!type.ok) return
    const built = await buildResendEmail(type.type, ctx, { new_status: "approved" })
    expect(built.metadata?.new_status).toBe("approved")
    expect(built.subject).toContain("aprobada")
    expect(built.html).toContain("<!DOCTYPE html>")
  })
})
