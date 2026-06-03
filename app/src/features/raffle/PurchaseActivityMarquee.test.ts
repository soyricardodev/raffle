import { describe, expect, it } from "vitest"
import { marqueeDurationSec } from "@/features/raffle/PurchaseActivityMarquee"

describe("marqueeDurationSec", () => {
  it("scales with item count within bounds", () => {
    expect(marqueeDurationSec(6)).toBeGreaterThan(marqueeDurationSec(2))
    expect(marqueeDurationSec(100)).toBeLessThanOrEqual(50)
  })
})
