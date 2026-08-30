import { describe, expect, it } from "vitest"
import { shouldShowHowToPlayCloud } from "@/features/raffle/how-to-play"

describe("shouldShowHowToPlayCloud", () => {
  it("shows when the raffle is selling", () => {
    expect(shouldShowHowToPlayCloud("active")).toBe(true)
    expect(shouldShowHowToPlayCloud("paused")).toBe(true)
  })

  it("hides when there is no live raffle", () => {
    expect(shouldShowHowToPlayCloud("finished")).toBe(false)
    expect(shouldShowHowToPlayCloud("draft")).toBe(false)
    expect(shouldShowHowToPlayCloud(undefined)).toBe(false)
  })
})
