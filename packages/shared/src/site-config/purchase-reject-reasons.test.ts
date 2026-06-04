import { describe, expect, it } from "vitest"
import {
  DEFAULT_PURCHASE_REJECT_REASONS,
  DUPLICATE_PAYMENT_REASON,
  findDuplicatePurchaseRejectReasonIndex,
  normalizePurchaseRejectReasons,
} from "./schemas"

describe("normalizePurchaseRejectReasons", () => {
  it("returns defaults when raw is missing or invalid", () => {
    expect(normalizePurchaseRejectReasons(undefined)).toEqual([...DEFAULT_PURCHASE_REJECT_REASONS])
    expect(normalizePurchaseRejectReasons(null)).toEqual([...DEFAULT_PURCHASE_REJECT_REASONS])
    expect(normalizePurchaseRejectReasons([])).toEqual([...DEFAULT_PURCHASE_REJECT_REASONS])
    expect(normalizePurchaseRejectReasons(["   "])).toEqual([...DEFAULT_PURCHASE_REJECT_REASONS])
  })

  it("preserves valid custom list order", () => {
    const custom = ["Motivo A", "Motivo B"]
    expect(normalizePurchaseRejectReasons(custom)).toEqual(custom)
  })

  it("includes requested default phrases", () => {
    const reasons = normalizePurchaseRejectReasons(undefined)
    expect(reasons).toContain("Referencia no compatible con la imagen")
    expect(reasons).toContain("Imagen de pago no corresponde a lo que se espera")
  })
})

describe("DUPLICATE_PAYMENT_REASON", () => {
  it("matches first default", () => {
    expect(DUPLICATE_PAYMENT_REASON).toBe(DEFAULT_PURCHASE_REJECT_REASONS[0])
    expect(DUPLICATE_PAYMENT_REASON).toBe("Pago duplicado")
  })
})

describe("findDuplicatePurchaseRejectReasonIndex", () => {
  it("returns index of second duplicate", () => {
    expect(findDuplicatePurchaseRejectReasonIndex(["A", "B", "A"])).toBe(2)
  })

  it("returns -1 when all unique", () => {
    expect(findDuplicatePurchaseRejectReasonIndex(["A", "B"])).toBe(-1)
  })
})
