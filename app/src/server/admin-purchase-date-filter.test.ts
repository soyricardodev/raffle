import { endOfDay, startOfDay } from "date-fns"
import { describe, expect, it } from "vitest"
import { adminPurchaseDateRangeBounds } from "@/server/repositories/purchases.repository"

describe("adminPurchaseDateRangeBounds", () => {
  it("returns inclusive start and end of local calendar day", () => {
    const { startAt, endAt } = adminPurchaseDateRangeBounds("2026-06-05", "2026-06-05")
    const day = new Date(2026, 5, 5)

    expect(startAt).toEqual(startOfDay(day))
    expect(endAt).toEqual(endOfDay(day))
  })

  it("supports open-ended ranges", () => {
    const onlyStart = adminPurchaseDateRangeBounds("2026-06-01", null)
    const onlyEnd = adminPurchaseDateRangeBounds(null, "2026-06-30")

    expect(onlyStart.startAt).toEqual(startOfDay(new Date(2026, 5, 1)))
    expect(onlyStart.endAt).toBeUndefined()
    expect(onlyEnd.startAt).toBeUndefined()
    expect(onlyEnd.endAt).toEqual(endOfDay(new Date(2026, 5, 30)))
  })

  it("ignores invalid date strings", () => {
    expect(adminPurchaseDateRangeBounds("2026-13-40", "2026-06-03")).toEqual({
      startAt: undefined,
      endAt: endOfDay(new Date(2026, 5, 3)),
    })
  })
})
