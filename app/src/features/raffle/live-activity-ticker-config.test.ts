import { describe, expect, it } from "vitest"
import { buildTickerViewModel } from "@/features/raffle/live-activity-ticker-config"

describe("buildTickerViewModel", () => {
  it("shows only the current online count for the live marquee", () => {
    const view = buildTickerViewModel("live", { activeBuyersCount: 3 })

    expect(view.marqueeItems).toEqual(["3 personas en línea ahora"])
    expect(view.ariaSummary).toBe("3 personas en línea ahora")
  })

  it("uses singular copy for one person online", () => {
    const view = buildTickerViewModel("live", { activeBuyersCount: 1 })

    expect(view.marqueeItems).toEqual(["1 persona en línea ahora"])
  })
})
