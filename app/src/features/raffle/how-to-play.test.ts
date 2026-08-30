import { describe, expect, it } from "vitest"
import {
  DEFAULT_HOW_TO_PLAY_LABEL,
  resolveHowToPlayLabel,
  shouldShowHowToPlayCloud,
} from "@/features/raffle/how-to-play"

describe("resolveHowToPlayLabel", () => {
  it("uses the default when empty", () => {
    expect(resolveHowToPlayLabel("")).toBe(DEFAULT_HOW_TO_PLAY_LABEL)
    expect(resolveHowToPlayLabel("   ")).toBe(DEFAULT_HOW_TO_PLAY_LABEL)
    expect(resolveHowToPlayLabel(undefined)).toBe(DEFAULT_HOW_TO_PLAY_LABEL)
  })

  it("keeps a custom label", () => {
    expect(resolveHowToPlayLabel("  Mira el reel  ")).toBe("Mira el reel")
  })
})

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
