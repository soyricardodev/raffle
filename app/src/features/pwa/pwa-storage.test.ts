import { describe, expect, it } from "vitest"
import { parsePwaStorage, wasDismissedRecently } from "./pwa-storage"

describe("pwa storage", () => {
  it("returns empty state for invalid JSON", () => {
    expect(parsePwaStorage("nope")).toEqual({
      v: 1,
      installDismissedAt: null,
      notifyDismissedAt: null,
      subscribedEndpoint: null,
    })
  })

  it("reads versioned fields", () => {
    const parsed = parsePwaStorage(
      JSON.stringify({ v: 1, installDismissedAt: 10, subscribedEndpoint: "https://x" }),
    )
    expect(parsed.installDismissedAt).toBe(10)
    expect(parsed.subscribedEndpoint).toBe("https://x")
  })

  it("treats cooldown as recent", () => {
    expect(wasDismissedRecently(1_000, 500, 1_400)).toBe(true)
    expect(wasDismissedRecently(1_000, 500, 1_600)).toBe(false)
    expect(wasDismissedRecently(null, 500, 1_600)).toBe(false)
  })
})
