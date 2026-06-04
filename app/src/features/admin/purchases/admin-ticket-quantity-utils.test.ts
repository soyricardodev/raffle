import { describe, expect, it } from "vitest"
import {
  formatAdminStockHint,
  getAdminTicketTargetBounds,
  parseAdminTicketTargetDraft,
  resolveAdminTicketTarget,
} from "@/features/admin/purchases/admin-ticket-quantity-utils"

describe("getAdminTicketTargetBounds", () => {
  it("uses current quantity plus raffle available stock as max", () => {
    expect(getAdminTicketTargetBounds(120, 880)).toEqual({
      min: 1,
      max: 1000,
      available: 880,
    })
  })

  it("allows targets above 500 when stock permits", () => {
    const bounds = getAdminTicketTargetBounds(400, 2000)
    expect(bounds.max).toBe(2400)
    expect(resolveAdminTicketTarget("1500", 400, 2000).target).toBe(1500)
  })

  it("allows targets above 1000 when stock permits", () => {
    const bounds = getAdminTicketTargetBounds(1000, 9000)
    expect(bounds.max).toBe(10000)
    expect(resolveAdminTicketTarget("7500", 1000, 9000).target).toBe(7500)
  })
})

describe("resolveAdminTicketTarget", () => {
  it("blocks targets above stock-backed max without clamping target", () => {
    const result = resolveAdminTicketTarget("200", 100, 50)
    expect(result.message).toMatch(/stock disponible/i)
    expect(result.target).toBe(100)
    expect(result.parsed).toBe(200)
    expect(result.canSubmit).toBe(false)
  })

  it("allows valid increases within stock", () => {
    const result = resolveAdminTicketTarget("600", 100, 500)
    expect(result.message).toBeNull()
    expect(result.target).toBe(600)
    expect(result.delta).toBe(500)
    expect(result.canSubmit).toBe(true)
  })

  it("rejects invalid draft text", () => {
    const result = resolveAdminTicketTarget("abc", 10, 100)
    expect(result.message).toMatch(/válida/i)
    expect(result.canSubmit).toBe(false)
  })
})

describe("parseAdminTicketTargetDraft", () => {
  it("parses integer drafts", () => {
    expect(parseAdminTicketTargetDraft("750")).toBe(750)
  })

  it("returns null for invalid drafts", () => {
    expect(parseAdminTicketTargetDraft("abc")).toBeNull()
  })
})

describe("formatAdminStockHint", () => {
  it("describes available stock and max for purchase", () => {
    expect(formatAdminStockHint(getAdminTicketTargetBounds(100, 50))).toBe(
      "50 disponibles en la rifa · máx. 150 en esta compra",
    )
  })
})
