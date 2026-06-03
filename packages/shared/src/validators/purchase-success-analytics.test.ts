import { describe, expect, it } from "vitest"
import { PurchaseSuccessAnalyticsInputSchema } from "./purchase-success-analytics"

describe("PurchaseSuccessAnalyticsInputSchema", () => {
  it("accepts purchase_success_open", () => {
    const parsed = PurchaseSuccessAnalyticsInputSchema.safeParse({
      event: "purchase_success_open",
      properties: { purchaseId: 26, ticketCount: 191, promoVisible: true },
      sessionId: "abc",
    })
    expect(parsed.success).toBe(true)
  })

  it("accepts whatsapp_cta_click with reminder source", () => {
    const parsed = PurchaseSuccessAnalyticsInputSchema.safeParse({
      event: "whatsapp_cta_click",
      properties: { purchaseId: 26, ticketCount: 191, source: "reminder_toast" },
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects unknown events", () => {
    const parsed = PurchaseSuccessAnalyticsInputSchema.safeParse({
      event: "unknown_event",
      properties: { purchaseId: 1 },
    })
    expect(parsed.success).toBe(false)
  })
})
