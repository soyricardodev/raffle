import { describe, expect, it } from "vitest"
import { adminPurchasesRefetchInterval } from "./admin-purchases-queries"

describe("adminPurchasesRefetchInterval", () => {
  it("polls only on the first loaded page", () => {
    expect(adminPurchasesRefetchInterval({ state: { data: undefined } })).toBe(30_000)
    expect(adminPurchasesRefetchInterval({ state: { data: { pages: [{}] } } })).toBe(30_000)
    expect(adminPurchasesRefetchInterval({ state: { data: { pages: [{}, {}] } } })).toBe(false)
  })
})
