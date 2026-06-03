import { describe, expect, it } from "vitest"
import { buildEmailForType, buildSampleTestEmail } from "./email-templates"

describe("email-templates", () => {
  const ctx = {
    purchaseId: 42,
    customerName: "María",
    customerEmail: "maria@test.com",
    ticketQuantity: 2,
    totalAmountCents: 2000,
    paymentMethod: "pago_movil",
    raffleName: "Rifa Test",
    ticketNumbers: ["1", "2"],
  }

  it("builds purchase confirmation", () => {
    const email = buildEmailForType("purchase_confirmation", ctx)
    expect(email.subject).toContain("Confirmación")
    expect(email.html).toContain("María")
    expect(email.html).toContain("#42")
  })

  it("builds status update with metadata", () => {
    const email = buildEmailForType("status_update", ctx, { status: "approved" })
    expect(email.metadata?.new_status).toBe("approved")
    expect(email.subject).toContain("aprobada")
  })

  it("builds sample test email", () => {
    const email = buildSampleTestEmail("test", "admin@test.com")
    expect(email.type).toBe("test")
    expect(email.subject).toContain("prueba")
  })
})
