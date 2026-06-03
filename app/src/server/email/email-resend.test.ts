import { describe, expect, it } from "vitest"
import { buildResendEmail, parseEmailLogType } from "./email-resend"

describe("email-resend", () => {
  const ctx = {
    purchaseId: 1,
    customerName: "Ana",
    customerEmail: "ana@test.com",
    ticketQuantity: 2,
    totalAmountCents: 1000,
    paymentMethod: "pago_movil",
    raffleName: "Rifa",
    ticketNumbers: ["10", "11"],
  }

  it("rejects invalid email type", () => {
    expect(parseEmailLogType("not_a_type").ok).toBe(false)
  })

  it("rejects test type for resend", () => {
    expect(parseEmailLogType("test").ok).toBe(false)
  })

  it("builds status update from metadata", () => {
    const type = parseEmailLogType("status_update")
    expect(type.ok).toBe(true)
    if (!type.ok) return
    const built = buildResendEmail(type.type, ctx, { new_status: "approved" })
    expect(built.metadata?.new_status).toBe("approved")
    expect(built.subject).toContain("aprobada")
  })
})
