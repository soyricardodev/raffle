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
    expect(email.html).not.toContain("Motivo:")
  })

  it("includes rejection reason in status email when notes exist", () => {
    const email = buildEmailForType(
      "status_update",
      { ...ctx, notes: "Pago duplicado" },
      { status: "rejected" },
    )
    expect(email.metadata?.new_status).toBe("rejected")
    expect(email.html).toContain("Motivo:")
    expect(email.html).toContain("Pago duplicado")
  })

  it("omits rejection reason when notes are empty", () => {
    const email = buildEmailForType("status_update", { ...ctx, notes: "" }, { status: "rejected" })
    expect(email.html).not.toContain("Motivo:")
  })

  it("builds sample test email", () => {
    const email = buildSampleTestEmail("test", "admin@test.com")
    expect(email.type).toBe("test")
    expect(email.subject).toContain("prueba")
  })
})
