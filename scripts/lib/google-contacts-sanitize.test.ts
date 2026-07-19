import { describe, expect, it } from "vitest"
import {
  formatPurchaseNote,
  isJunkName,
  sanitizeCustomerName,
  sanitizePhone,
  titleCaseName,
} from "./google-contacts-sanitize"

describe("google-contacts-sanitize", () => {
  it("drops junk names", () => {
    expect(isJunkName("asdasdasd")).toBe(true)
    expect(isJunkName("María Pérez")).toBe(false)
  })

  it("normalizes Venezuelan mobile numbers", () => {
    expect(sanitizePhone("04121234567")?.formatted).toBe("+58 412 1234567")
    expect(sanitizePhone("4121234567")).toBeTruthy()
    expect(sanitizePhone("o4144067822")?.digits).toBe("04144067822")
    expect(sanitizePhone("995284495")).toBeNull()
  })

  it("title-cases Spanish names", () => {
    expect(titleCaseName("aaron betancourt")).toBe("Aaron Betancourt")
    expect(titleCaseName("MARÍA josé")).toBe("María José")
  })

  it("uses fallback when name is numeric", () => {
    expect(sanitizeCustomerName("04149479837", "04149479837")).toBe("Cliente 9837")
  })

  it("formats purchase notes in Spanish", () => {
    const note = formatPurchaseNote(Date.parse("2026-07-15T12:00:00.000Z"), "Rifa iPhone")
    expect(note).toContain("Última compra:")
    expect(note).toContain("Rifa: Rifa iPhone")
  })
})
