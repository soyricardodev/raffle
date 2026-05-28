import { describe, expect, it } from "vitest"
import { parseAccountInfo, safeParseAccountInfo } from "./schemas.js"

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

  it("validates binance email only", () => {
    const data = parseAccountInfo("binance", { email: "a@b.com" })
    expect(data.email).toBe("a@b.com")
  })
})
