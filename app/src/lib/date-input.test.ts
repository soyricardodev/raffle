import { describe, expect, it } from "vitest"
import {
  dateRangeFromStored,
  datetimeLocalToIso,
  formatDateOnly,
  formatDateRangeLabel,
  formatDatetimeLocal,
  isoToDatetimeLocal,
  isCalendarDayBefore,
  isCalendarDayBeforeDate,
  parseDateOnly,
  parseDatetimeLocal,
  startOfDay,
  storedRangeFromDateRange,
} from "@/lib/date-input"

describe("parseDatetimeLocal", () => {
  it("parses date and time", () => {
    const date = parseDatetimeLocal("2026-06-15T14:30")
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(5)
    expect(date?.getDate()).toBe(15)
    expect(date?.getHours()).toBe(14)
    expect(date?.getMinutes()).toBe(30)
  })

  it("returns undefined for empty or invalid values", () => {
    expect(parseDatetimeLocal("")).toBeUndefined()
    expect(parseDatetimeLocal("not-a-date")).toBeUndefined()
  })
})

describe("formatDatetimeLocal roundtrip", () => {
  it("preserves local date and time", () => {
    const original = new Date(2026, 5, 15, 9, 45)
    const formatted = formatDatetimeLocal(original)
    const parsed = parseDatetimeLocal(formatted)
    expect(parsed?.getTime()).toBe(original.getTime())
  })
})

describe("datetimeLocalToIso", () => {
  it("converts local datetime string to ISO", () => {
    const iso = datetimeLocalToIso("2026-06-15T14:30")
    expect(new Date(iso).getHours()).toBe(14)
    expect(new Date(iso).getMinutes()).toBe(30)
  })
})

describe("isoToDatetimeLocal", () => {
  it("formats ISO strings for datetime-local inputs", () => {
    const local = isoToDatetimeLocal("2026-06-15T18:30:00.000Z")
    expect(parseDatetimeLocal(local)?.getTime()).toBe(new Date("2026-06-15T18:30:00.000Z").getTime())
  })
})

describe("parseDateOnly", () => {
  it("parses YYYY-MM-DD", () => {
    const date = parseDateOnly("2026-06-03")
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(5)
    expect(date?.getDate()).toBe(3)
  })
})

describe("formatDateRangeLabel", () => {
  it("formats valid ranges", () => {
    const label = formatDateRangeLabel("2026-06-01", "2026-06-03")
    expect(label).toContain("2026")
  })

  it("falls back to raw strings when parsing fails", () => {
    expect(formatDateRangeLabel("2026-13-40", "2026-06-03")).toContain("2026-13-40")
  })
})

describe("calendar day minimum policy", () => {
  it("rejects calendar days before minDay but allows same day earlier time", () => {
    const minDay = startOfDay(new Date(2026, 5, 3, 15, 0))
    expect(isCalendarDayBefore("2026-06-02T23:59", minDay)).toBe(true)
    expect(isCalendarDayBefore("2026-06-03T09:00", minDay)).toBe(false)
    expect(isCalendarDayBeforeDate(new Date(2026, 5, 3, 9, 0), minDay)).toBe(false)
  })
})

describe("stored date range helpers", () => {
  it("roundtrips stored ranges", () => {
    const range = {
      from: new Date(2026, 5, 1),
      to: new Date(2026, 5, 10),
    }
    const stored = storedRangeFromDateRange(range)
    expect(stored.start).toBe(formatDateOnly(range.from))
    expect(stored.end).toBe(formatDateOnly(range.to))
    expect(dateRangeFromStored(stored.start, stored.end)?.from?.getDate()).toBe(1)
    expect(dateRangeFromStored(stored.start, stored.end)?.to?.getDate()).toBe(10)
  })
})
