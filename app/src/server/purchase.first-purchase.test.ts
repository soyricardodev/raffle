import { describe, expect, it } from "vitest"
import { buildPurchaseFinalizeWhatsAppMessage } from "@/features/layout/social-links"

describe("purchase first-purchase contract", () => {
  it("builds finalize message with ticket count label", () => {
    expect(
      buildPurchaseFinalizeWhatsAppMessage({
        customerName: "Juan Pérez",
        raffleName: "Auto 2026",
        ticketCount: 1,
      }),
    ).toContain("1 boleto")

    expect(
      buildPurchaseFinalizeWhatsAppMessage({
        customerName: "Juan Pérez",
        raffleName: "Auto 2026",
        ticketCount: 5,
      }),
    ).toContain("5 boletos")
  })
})
