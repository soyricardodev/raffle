import { describe, expect, it } from "vitest"
import {
  customerLocationFieldError,
  formatCustomerLocation,
} from "./index.js"

describe("formatCustomerLocation", () => {
  it("formats Venezuela state", () => {
    expect(formatCustomerLocation("venezuela", "Carabobo", "")).toBe("Venezuela, Carabobo")
  })

  it("returns empty when Venezuela without state", () => {
    expect(formatCustomerLocation("venezuela", "", "")).toBe("")
  })

  it("uses custom text for other", () => {
    expect(formatCustomerLocation("other", "", "  Miami, USA  ")).toBe("Miami, USA")
  })
})

describe("customerLocationFieldError", () => {
  it("requires state for Venezuela", () => {
    expect(customerLocationFieldError("venezuela", "", "")).toBe("Selecciona tu estado")
  })

  it("requires text for other country", () => {
    expect(customerLocationFieldError("other", "", "  ")).toBe("Indica país y ciudad")
  })
})
