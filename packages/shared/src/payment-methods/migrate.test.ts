import { describe, expect, it } from "vitest"
import {
  buildPaymentAccountLabel,
  mergeMinTickets,
  normalizeLegacyAccountInfo,
  parseLegacyPaymentMethodId,
  parseRawAccountInfo,
  pickCanonicalAccountId,
  resolveOrCreateRafflePaymentMethod,
  type RafflePaymentMethodCache,
} from "./migrate.js"
import { stableAccountInfoKey } from "./normalize.js"

describe("normalizeLegacyAccountInfo", () => {
  it("splits cedula V-12345678", () => {
    const data = normalizeLegacyAccountInfo("pago_movil", {
      bank: "Banesco",
      phone: "04121234567",
      cedula: "V-12345678",
    })
    expect(data.cedula_type).toBe("V")
    expect(data.cedula_number).toBe("12345678")
    expect(data.cedula).toBeUndefined()
  })

  it("defaults digits-only cedula to type V", () => {
    const data = normalizeLegacyAccountInfo("pago_movil", {
      bank: "Banesco",
      phone: "04121234567",
      cedula: "12345678",
    })
    expect(data.cedula_type).toBe("V")
    expect(data.cedula_number).toBe("12345678")
  })

  it("parses compact cedula V12345678", () => {
    const data = normalizeLegacyAccountInfo("pago_movil", {
      bank: "X",
      phone: "04120000000",
      cedula: "J12345678",
    })
    expect(data.cedula_type).toBe("J")
    expect(data.cedula_number).toBe("12345678")
  })

  it("defaults cedula_type when only cedula_number present", () => {
    const data = normalizeLegacyAccountInfo("pago_movil", {
      bank: "X",
      phone: "04120000000",
      cedula_number: "87654321",
    })
    expect(data.cedula_type).toBe("V")
    expect(data.cedula_number).toBe("87654321")
  })

  it("maps Spanish legacy keys", () => {
    const data = normalizeLegacyAccountInfo("pago_movil", {
      banco: "Mercantil",
      telefono: "04129999999",
      cedula: "12345678",
    })
    expect(data.bank).toBe("Mercantil")
    expect(data.phone).toBe("04129999999")
    expect(data.cedula_number).toBe("12345678")
  })
})

describe("stableAccountInfoKey dedup", () => {
  it("produces same key for equivalent legacy infos", () => {
    const a = normalizeLegacyAccountInfo("pago_movil", {
      bank: "Banesco",
      phone: "04121234567",
      cedula: "12345678",
    })
    const b = normalizeLegacyAccountInfo("pago_movil", {
      banco: "Banesco",
      telefono: "04121234567",
      cedula: "V-12345678",
    })
    expect(stableAccountInfoKey("pago_movil", a)).toBe(stableAccountInfoKey("pago_movil", b))
  })
})

describe("buildPaymentAccountLabel", () => {
  it("builds readable label from account info", () => {
    const info = normalizeLegacyAccountInfo("pago_movil", {
      bank: "Banesco",
      phone: "04121234567",
      cedula: "12345678",
    })
    const label = buildPaymentAccountLabel("pago_movil", info)
    expect(label).toContain("Banesco")
    expect(label).toContain("04121234567")
  })
})

describe("parseRawAccountInfo", () => {
  it("parses JSON string", () => {
    expect(parseRawAccountInfo('{"bank":"X","phone":"0412"}')).toEqual({
      bank: "X",
      phone: "0412",
    })
  })
})

describe("parseLegacyPaymentMethodId", () => {
  it("parses migration labels", () => {
    expect(parseLegacyPaymentMethodId("pago_movil #47")).toBe(47)
    expect(parseLegacyPaymentMethodId("Banesco · 0412")).toBeNull()
  })
})

describe("mergeMinTickets", () => {
  it("returns min of non-null values", () => {
    expect(mergeMinTickets(5, 3)).toBe(3)
    expect(mergeMinTickets(null, 2)).toBe(2)
    expect(mergeMinTickets(4, null)).toBe(4)
  })
})

describe("pickCanonicalAccountId", () => {
  it("does not mutate the input array", () => {
    const ids = [3, 1, 2]
    pickCanonicalAccountId(ids, (id) => id)
    expect(ids).toEqual([3, 1, 2])
  })

  it("prefers higher score then lower id", () => {
    const picked = pickCanonicalAccountId([10, 20, 30], (id) => (id === 20 ? 5 : 1))
    expect(picked).toBe(20)
  })
})

describe("resolveOrCreateRafflePaymentMethod", () => {
  it("reuses rpm for same raffle+account and merges minTickets", async () => {
    const cache: RafflePaymentMethodCache = new Map()
    const updates: Array<{ rpmId: number; minTickets: number | null }> = []

    const first = await resolveOrCreateRafflePaymentMethod(
      cache,
      1,
      99,
      { isActive: true, minTickets: 5 },
      async () => 100,
    )
    const second = await resolveOrCreateRafflePaymentMethod(
      cache,
      1,
      99,
      { isActive: true, minTickets: 2 },
      async () => {
        throw new Error("should not create")
      },
      async (rpmId, patch) => {
        updates.push({ rpmId, minTickets: patch.minTickets })
      },
    )

    expect(first).toEqual({ rpmId: 100, created: true })
    expect(second).toEqual({ rpmId: 100, created: false })
    expect(updates).toEqual([{ rpmId: 100, minTickets: 2 }])
  })
})
