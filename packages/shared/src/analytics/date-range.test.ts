import { describe, expect, it } from "vitest"
import {
  dateRangeToPurchaseDateBounds,
  explorePurchasesSearchParams,
  periodStateToDateRange,
  periodStateToSearchParams,
} from "./date-range.js"

describe("periodStateToDateRange", () => {
  it("maps preset days", () => {
    expect(periodStateToDateRange({ kind: "preset", days: 30 })).toEqual({
      mode: "days",
      days: 30,
    })
  })

  it("maps todo to all", () => {
    expect(periodStateToDateRange({ kind: "preset", days: 0 })).toEqual({ mode: "all" })
  })

  it("maps custom dates to range ms", () => {
    const range = periodStateToDateRange({
      kind: "custom",
      from: "2024-01-01",
      to: "2024-01-31",
    })
    expect(range.mode).toBe("range")
    if (range.mode === "range") {
      expect(range.fromMs).toBeLessThanOrEqual(range.toMs)
    }
  })
})

describe("periodStateToSearchParams", () => {
  it("delegates preset to analytics params", () => {
    const params = periodStateToSearchParams({ kind: "preset", days: 7 }, "3")
    expect(params.get("days")).toBe("7")
    expect(params.get("raffleId")).toBe("3")
  })
})

describe("explorePurchasesSearchParams", () => {
  it("uses purchase start/end keys only", () => {
    const params = explorePurchasesSearchParams(
      { kind: "custom", from: "2024-06-01", to: "2024-06-15" },
      { raffleId: "2", page: 1, limit: 25, status: "approved" },
    )
    expect(params.get("start")).toBe("2024-06-01")
    expect(params.get("end")).toBe("2024-06-15")
    expect(params.get("raffle_id")).toBe("2")
    expect(params.get("days")).toBeNull()
    expect(params.get("from")).toBeNull()
  })

  it("omits bounds for all-time", () => {
    const params = explorePurchasesSearchParams({ kind: "preset", days: 0 }, {})
    expect(params.get("start")).toBeNull()
    expect(params.get("end")).toBeNull()
  })
})

describe("dateRangeToPurchaseDateBounds", () => {
  it("returns bounds for days mode", () => {
    const bounds = dateRangeToPurchaseDateBounds({ mode: "days", days: 7 })
    expect(bounds.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(bounds.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
