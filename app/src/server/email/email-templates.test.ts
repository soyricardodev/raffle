import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearEmailBrandingCache } from "./email-branding.server"
import { buildEmailForType, buildSampleTestEmail } from "./email-templates"
import type { PurchaseEmailContext } from "./email-types"

const mockBranding = {
  appUrl: "https://rifas.example.com",
  siteName: "Rifas Test",
  tagline: "Tu oportunidad de ganar",
  colors: { primary: "#8B7355", secondary: "#F5F5DC", accent: "#FFD700" },
  logoUrl: "https://rifas.example.com/uploads/site/logo.png",
  contact: { phone: "04141234567", email: "contacto@rifas.test", address: "" },
  whatsapp: "584121234567",
}

vi.mock("./email-branding.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./email-branding.server")>()
  return {
    ...actual,
    loadEmailBranding: vi.fn(async () => mockBranding),
  }
})

describe("email-templates", () => {
  const ctx: PurchaseEmailContext = {
    purchaseId: 42,
    customerName: "María",
    customerEmail: "maria@test.com",
    customerPhone: "04149876543",
    ticketQuantity: 2,
    totalAmountCents: 2000,
    paymentMethod: "pago_movil",
    paymentMethodLabel: "Pago móvil",
    raffleName: "Rifa Test",
    raffleImageUrl: "/uploads/raffles/hero.jpg",
    ticketNumbers: ["1", "2"],
  }

  beforeEach(() => {
    clearEmailBrandingCache()
  })

  it("builds purchase confirmation with branded HTML", async () => {
    const email = await buildEmailForType("purchase_confirmation", ctx)
    expect(email.subject).toContain("Confirmación")
    expect(email.html).toContain("<!DOCTYPE html>")
    expect(email.html).toContain("María")
    expect(email.html).toContain("#42")
    expect(email.html).toContain("#8B7355")
    expect(email.html).toContain("https://rifas.example.com/uploads/site/logo.png")
    expect(email.html).toContain("https://rifas.example.com/uploads/raffles/hero.jpg")
    expect(email.html).toContain("<td")
    expect(email.html).toContain("verificar?phone=")
    expect(email.html).toContain("Buscar boletos")
    expect(email.html).not.toContain("Pendiente de verificación")
    expect(email.html).not.toContain("Boletos: 1, 2")
  })

  it("escapes malicious customer name", async () => {
    const email = await buildEmailForType("purchase_confirmation", {
      ...ctx,
      customerName: '<script>alert("x")</script>',
    })
    expect(email.html).not.toContain("<script>")
    expect(email.html).toContain("&lt;script&gt;")
  })

  it("builds status update with metadata", async () => {
    const email = await buildEmailForType("status_update", ctx, { status: "approved" })
    expect(email.metadata?.new_status).toBe("approved")
    expect(email.subject).toContain("aprobada")
    expect(email.html).not.toContain("Motivo:")
  })

  it("includes rejection reason in status email when notes exist", async () => {
    const email = await buildEmailForType(
      "status_update",
      { ...ctx, notes: "Pago duplicado" },
      { status: "rejected" },
    )
    expect(email.metadata?.new_status).toBe("rejected")
    expect(email.html).toContain("Motivo:")
    expect(email.html).toContain("Pago duplicado")
    expect(email.html).toContain("wa.me/584121234567")
    expect(email.html).toContain("Resolver por WhatsApp")
    expect(email.html).toContain(encodeURIComponent("problema de mi pago"))
  })

  it("omits rejection reason when notes are empty", async () => {
    const email = await buildEmailForType("status_update", { ...ctx, notes: "" }, { status: "rejected" })
    expect(email.html).not.toContain("Motivo:")
    expect(email.html).toContain("wa.me/584121234567")
  })

  it("omits WhatsApp CTA on rejection when WhatsApp is not configured", async () => {
    const { loadEmailBranding } = await import("./email-branding.server")
    vi.mocked(loadEmailBranding).mockResolvedValueOnce({
      ...mockBranding,
      whatsapp: "",
    })
    const email = await buildEmailForType("status_update", ctx, { status: "rejected" })
    expect(email.html).not.toContain("wa.me/")
    expect(email.html).not.toContain("Resolver por WhatsApp")
  })

  it("builds ticket modification email", async () => {
    const email = await buildEmailForType("ticket_modification", ctx, {
      modification: "add",
      quantity: 5,
    })
    expect(email.subject).toContain("agregados")
    expect(email.metadata).toEqual({ modification: "add", quantity: 5 })
  })

  it("builds purchase reassign email", async () => {
    const email = await buildEmailForType("purchase_reassign", ctx)
    expect(email.subject).toContain("reasignados")
    expect(email.html).toContain("0001")
  })

  it("builds sample test email", async () => {
    const email = await buildSampleTestEmail("test", "admin@test.com")
    expect(email.type).toBe("test")
    expect(email.subject).toContain("prueba")
    expect(email.html).toContain("<!DOCTYPE html>")
  })
})
