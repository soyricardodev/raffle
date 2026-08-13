import { describe, expect, it } from "vitest"
import { normalizePhone } from "../db/phone.js"
import {
  isValidCustomerPhone,
  sanitizePhoneInput,
} from "./buyer-identity.js"

describe("free-form phone input", () => {
  it("keeps valid phone symbols", () => {
    expect(sanitizePhoneInput("+58 412-1234567")).toBe("+58 412-1234567")
    expect(sanitizePhoneInput("(0412) 1234567")).toBe("(0412) 1234567")
    expect(sanitizePhoneInput("0412abc1234567")).toBe("04121234567")
  })

  it("accepts national and international digit counts", () => {
    expect(isValidCustomerPhone("04121234567")).toBe(true)
    expect(isValidCustomerPhone("+58 412 1234567")).toBe(true)
    expect(isValidCustomerPhone("+34600111222")).toBe(true)
    expect(isValidCustomerPhone("1234567")).toBe(true)
    expect(isValidCustomerPhone("123456789012345")).toBe(true)
    expect(isValidCustomerPhone("123456")).toBe(false)
    expect(isValidCustomerPhone("1234567890123456")).toBe(false)
    expect(isValidCustomerPhone("123")).toBe(false)
    expect(isValidCustomerPhone("abc")).toBe(false)
    expect(isValidCustomerPhone("phone-only")).toBe(false)
  })
})

describe("normalizePhone canonicalization", () => {
  it("equates Venezuelan national and +58 forms", () => {
    expect(normalizePhone("04121234567")).toBe("04121234567")
    expect(normalizePhone("+58 412 1234567")).toBe("04121234567")
    expect(normalizePhone("584121234567")).toBe("04121234567")
    expect(normalizePhone("4121234567")).toBe("04121234567")
  })

  it("leaves non-VE numbers as digits", () => {
    expect(normalizePhone("+34 600 111 222")).toBe("34600111222")
  })
})
