import { describe, expect, it } from "vitest"
import { formatDate } from "@/lib/format"
import { formatPushLastSeen, subscriberInitials } from "./push-subscriber-format"

describe("subscriberInitials", () => {
  it("uses the first letter of the first two words", () => {
    expect(subscriberInitials("María Pérez")).toBe("MP")
    expect(subscriberInitials("María José Pérez")).toBe("MJ")
  })

  it("takes two letters from a single word", () => {
    expect(subscriberInitials("Ana")).toBe("AN")
  })

  it("ignores extra spaces", () => {
    expect(subscriberInitials("  Luis   Rojas  ")).toBe("LR")
    expect(subscriberInitials("   ")).toBe("")
  })
})

describe("formatPushLastSeen", () => {
  const now = Date.parse("2026-09-02T12:00:00.000Z")

  it("uses short relative labels for recent activity", () => {
    expect(formatPushLastSeen("2026-09-02T11:59:30.000Z", now)).toBe("Ahora")
    expect(formatPushLastSeen("2026-09-02T11:47:00.000Z", now)).toBe("Hace 13 min")
    expect(formatPushLastSeen("2026-09-02T09:00:00.000Z", now)).toBe("Hace 3 h")
    expect(formatPushLastSeen("2026-09-01T12:00:00.000Z", now)).toBe("Ayer")
    expect(formatPushLastSeen("2026-08-30T12:00:00.000Z", now)).toBe("Hace 3 d")
  })

  it("falls back to a date after a week", () => {
    const older = "2026-08-10T12:00:00.000Z"
    expect(formatPushLastSeen(older, now)).toBe(formatDate(older))
  })
})
