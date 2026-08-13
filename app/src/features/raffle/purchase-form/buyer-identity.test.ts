import {
  formatCustomerCi,
  isValidCustomerCi,
  isValidCustomerPhone,
  normalizeCustomerCi,
  parseCustomerCi,
} from "@raffle/shared/validators"
import { describe, expect, it } from "vitest"

describe("buyer identity", () => {
  it("parses and formats CI", () => {
    expect(parseCustomerCi("v-12.345.678")).toEqual({ prefix: "V", number: "12345678" })
    expect(formatCustomerCi("E", "87654321")).toBe("E87654321")
    expect(normalizeCustomerCi("V12345678")).toBe("V12345678")
  })

  it("validates free-form phones", () => {
    expect(isValidCustomerPhone("04121234567")).toBe(true)
    expect(isValidCustomerPhone("+58 412 1234567")).toBe(true)
    expect(isValidCustomerPhone("+34600111222")).toBe(true)
    expect(isValidCustomerPhone("12")).toBe(false)
  })

  it("validates full CI string", () => {
    expect(isValidCustomerCi("J123456789")).toBe(true)
    expect(isValidCustomerCi("X123")).toBe(false)
  })
})
