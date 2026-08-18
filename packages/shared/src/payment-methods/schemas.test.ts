import { describe, expect, it } from "vitest"
import { parseAccountInfo, ReorderPaymentAccountsInput, safeParseAccountInfo } from "./schemas.js"

describe("payment account schemas", () => {
  it("validates pago movil with normalized keys", () => {
    const data = parseAccountInfo("pago_movil", {
      banco: "Banesco",
      telefono: "04121234567",
      cedula: "V-12345678",
    })
    expect(data.bank).toBe("Banesco")
    expect(data.phone).toBe("04121234567")
    expect(data.cedula_type).toBe("V")
    expect(data.cedula_number).toBe("12345678")
  })

  it("validates pago movil with digits-only cedula", () => {
    const data = parseAccountInfo("pago_movil", {
      bank: "Banesco",
      phone: "04121234567",
      cedula: "12345678",
    })
    expect(data.cedula_type).toBe("V")
    expect(data.cedula_number).toBe("12345678")
  })

  it("rejects non-numeric phone", () => {
    const result = safeParseAccountInfo("pago_movil", {
      bank: "X",
      phone: "04ab",
      cedula_type: "V",
      cedula_number: "1",
    })
    expect(result.success).toBe(false)
  })

  it("validates zelle email", () => {
    const data = parseAccountInfo("zelle", {
      email: "pay@example.com",
      holder_name: "Juan",
    })
    expect(data.email).toBe("pay@example.com")
    expect(data.holder_name).toBe("Juan")
  })

  it("validates zelle phone", () => {
    const data = parseAccountInfo("zelle", {
      phone: "5551234567",
      holder_name: "Juan",
    })
    expect(data.phone).toBe("5551234567")
    expect(data.holder_name).toBe("Juan")
  })

  it("validates zelle contact field as email or phone", () => {
    expect(parseAccountInfo("zelle", { contact: "pay@example.com" }).email).toBe("pay@example.com")
    expect(parseAccountInfo("zelle", { contact: "5551234567" }).phone).toBe("5551234567")
  })

  it("maps legacy zelle account phone to phone key", () => {
    const data = parseAccountInfo("zelle", { account: "5559876543" })
    expect(data.phone).toBe("5559876543")
    expect(data.email).toBeUndefined()
  })

  it("validates binance email only", () => {
    const data = parseAccountInfo("binance", { email: "a@b.com" })
    expect(data.email).toBe("a@b.com")
  })

  it("requires at least one id to reorder payment accounts", () => {
    expect(ReorderPaymentAccountsInput.safeParse({ ordered_ids: [] }).success).toBe(false)
    expect(ReorderPaymentAccountsInput.parse({ ordered_ids: [1, 2] }).ordered_ids).toEqual([1, 2])
  })
})
