import { describe, expect, it } from "vitest"
import {
  formatPublicBuyerName,
  formatRecentPurchaseMessage,
  formatRecentPurchaseMessageCompact,
  toPublicRecentPurchase,
} from "./public-recent-purchase"

describe("formatPublicBuyerName", () => {
  it("returns first name and last initial", () => {
    expect(formatPublicBuyerName("María González Pérez")).toBe("María P.")
  })

  it("returns single name unchanged", () => {
    expect(formatPublicBuyerName("Pedro")).toBe("Pedro")
  })

  it("returns fallback for empty input", () => {
    expect(formatPublicBuyerName("   ")).toBe("Alguien")
  })
})

describe("toPublicRecentPurchase", () => {
  it("masks customer name", () => {
    const row = toPublicRecentPurchase({
      publicId: "id-1",
      customerName: "Carlos Ruiz",
      ticketQuantity: 2,
      status: "pending",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    })
    expect(row.displayName).toBe("Carlos R.")
    expect(row.id).toBe("id-1")
  })
})

describe("formatRecentPurchaseMessageCompact", () => {
  it("uses short copy for marquee", () => {
    expect(formatRecentPurchaseMessageCompact("María G.", 3, "pending")).toBe(
      "María G. reservó 3",
    )
  })
})

describe("formatRecentPurchaseMessage", () => {
  it("uses full copy for accessibility", () => {
    expect(formatRecentPurchaseMessage("María G.", 3, "pending")).toBe(
      "María G. reservó 3 boletos",
    )
    expect(formatRecentPurchaseMessage("María G.", 1, "approved")).toBe(
      "María G. compró 1 boleto",
    )
  })
})
