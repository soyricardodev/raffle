import { describe, expect, it } from "vitest"
import {
  applyVenezuelanMobilePrefix,
  formatVenezuelanMobile,
  normalizeCountryScope,
  phoneDisplayValue,
  splitVenezuelanMobile,
  transitionPhoneScope,
  updateVenezuelanMobileSuffix,
} from "./buyer-identity.js"

describe("buyer identity phone helpers", () => {
  it("splits and formats Venezuelan mobile numbers", () => {
    expect(splitVenezuelanMobile("04121234567")).toEqual({
      prefix: "0412",
      suffix: "1234567",
    })
    expect(formatVenezuelanMobile("0414", "7654321")).toBe("04147654321")
  })

  it("shows only suffix in display mode for Venezuela", () => {
    expect(phoneDisplayValue("venezuela", "04121234567")).toBe("1234567")
    expect(phoneDisplayValue("venezuela", "+34600111222")).toBe("")
    expect(phoneDisplayValue("other", "+34600111222")).toBe("+34600111222")
  })

  it("clears invalid phone when switching to Venezuela", () => {
    expect(transitionPhoneScope("+34600111222", "venezuela")).toBe("")
    expect(transitionPhoneScope("04121234567", "venezuela")).toBe("04121234567")
  })

  it("formats international numbers when switching abroad", () => {
    expect(transitionPhoneScope("04121234567", "other")).toBe("+04121234567")
    expect(transitionPhoneScope("+34600111222", "other")).toBe("+34600111222")
  })

  it("updates suffix without phantom prefix when cleared", () => {
    expect(updateVenezuelanMobileSuffix("04121234567", "", "0412")).toBe("")
    expect(updateVenezuelanMobileSuffix("", "1234567", null)).toBe("04121234567")
  })

  it("preserves suffix when changing operator", () => {
    expect(applyVenezuelanMobilePrefix("04121234567", "0414")).toBe("04141234567")
  })

  it("normalizes legacy international scope", () => {
    expect(normalizeCountryScope("international")).toBe("other")
    expect(normalizeCountryScope("venezuela")).toBe("venezuela")
  })
})
