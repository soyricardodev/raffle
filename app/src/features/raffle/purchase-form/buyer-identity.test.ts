import { describe, expect, it } from "vitest"
import {
  formatCustomerCi,
  isValidCustomerCi,
  isValidCustomerPhone,
  isValidVenezuelanMobile,
  normalizeCustomerCi,
  parseCustomerCi,
} from "@raffle/shared/validators"

describe("buyer identity", () => {
  it("parses and formats CI", () => {
    expect(parseCustomerCi("v-12.345.678")).toEqual({ prefix: "V", number: "12345678" })
    expect(formatCustomerCi("E", "87654321")).toBe("E87654321")
    expect(normalizeCustomerCi("V12345678")).toBe("V12345678")
  })

  it("validates Venezuelan mobile", () => {
    expect(isValidVenezuelanMobile("04121234567")).toBe(true)
    expect(isValidVenezuelanMobile("04131234567")).toBe(false)
    expect(isValidCustomerPhone("04141234567", "venezuela")).toBe(true)
    expect(isValidCustomerPhone("+34600111222", "international")).toBe(true)
  })

  it("validates full CI string", () => {
    expect(isValidCustomerCi("J123456789")).toBe(true)
    expect(isValidCustomerCi("X123")).toBe(false)
  })
})
