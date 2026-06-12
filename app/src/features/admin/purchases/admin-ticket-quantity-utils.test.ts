import { describe, expect, it } from "vitest"
import {
  formatAdminTicketOperationConfirm,
  formatAdminTicketOperationHelp,
  getDefaultAdminTicketOperationDraft,
  parseAdminTicketOperationDraft,
  resolveAdminTicketOperation,
  validateAdminTicketRemoveQuantity,
} from "@/features/admin/purchases/admin-ticket-quantity-utils"

describe("getDefaultAdminTicketOperationDraft", () => {
  it("defaults to 1", () => {
    expect(getDefaultAdminTicketOperationDraft()).toBe("1")
  })
})

describe("resolveAdminTicketOperation", () => {
  it("accepts any positive integer without stock caps", () => {
    const result = resolveAdminTicketOperation("5000")
    expect(result.message).toBeNull()
    expect(result.parsed).toBe(5000)
    expect(result.canSubmit).toBe(true)
  })

  it("rejects zero and negative values", () => {
    expect(resolveAdminTicketOperation("0").canSubmit).toBe(false)
    expect(resolveAdminTicketOperation("-3").canSubmit).toBe(false)
  })

  it("rejects invalid draft text", () => {
    const result = resolveAdminTicketOperation("abc")
    expect(result.message).toMatch(/válida/i)
    expect(result.canSubmit).toBe(false)
  })
})

describe("parseAdminTicketOperationDraft", () => {
  it("parses integer drafts", () => {
    expect(parseAdminTicketOperationDraft("750")).toBe(750)
  })

  it("returns null for invalid drafts", () => {
    expect(parseAdminTicketOperationDraft("abc")).toBeNull()
  })
})

describe("validateAdminTicketRemoveQuantity", () => {
  it("allows removing fewer tickets than the current total", () => {
    expect(validateAdminTicketRemoveQuantity(3, 10)).toEqual({
      message: null,
      canRemove: true,
    })
  })

  it("rejects removing all tickets", () => {
    expect(validateAdminTicketRemoveQuantity(5, 5).canRemove).toBe(false)
    expect(validateAdminTicketRemoveQuantity(5, 5).message).toMatch(/hasta 4/)
  })

  it("rejects any remove when purchase has one ticket", () => {
    const result = validateAdminTicketRemoveQuantity(1, 1)
    expect(result.canRemove).toBe(false)
    expect(result.message).toMatch(/al menos 1/)
  })
})

describe("formatAdminTicketOperationHelp", () => {
  it("describes add operation with estimated total", () => {
    expect(formatAdminTicketOperationHelp("add", 5, 10, "Bs 100.00")).toBe(
      "Agregar 5 → 15 boleto(s) · ~Bs 100.00",
    )
  })

  it("describes remove operation", () => {
    expect(formatAdminTicketOperationHelp("remove", 3, 10, null)).toBe(
      "Quitar 3 → 7 boleto(s)",
    )
  })

  it("avoids impossible totals for invalid remove amounts", () => {
    expect(formatAdminTicketOperationHelp("remove", 5, 5, null)).toBe(
      "Quitar 5 → máximo 4 boleto(s)",
    )
  })
})

describe("formatAdminTicketOperationConfirm", () => {
  it("builds add confirmation copy", () => {
    expect(formatAdminTicketOperationConfirm("add", 2, 5, "Bs 70.00")).toBe(
      "¿Agregar 2 boleto(s)? De 5 a 7. Total aprox.: Bs 70.00.",
    )
  })

  it("avoids impossible totals for invalid remove amounts", () => {
    expect(formatAdminTicketOperationConfirm("remove", 5, 5, null)).toBe(
      "¿Quitar 5 boleto(s)? Debe quedar al menos 1 boleto.",
    )
  })
})
