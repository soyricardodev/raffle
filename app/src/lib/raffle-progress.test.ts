import { describe, expect, it } from "vitest"
import { calculateRaffleSalesProgress } from "@/lib/raffle-progress"

describe("calculateRaffleSalesProgress", () => {
  it("sums sold and reserved against total", () => {
    expect(
      calculateRaffleSalesProgress({
        tickets_sold: 30,
        tickets_reserved: 20,
        total_tickets: 100,
      }),
    ).toEqual({
      percentage: 50,
      sold: 30,
      reserved: 20,
      occupied: 50,
      total: 100,
    })
  })

  it("caps at 100%", () => {
    expect(
      calculateRaffleSalesProgress({
        tickets_sold: 90,
        tickets_reserved: 20,
        total_tickets: 100,
      }).percentage,
    ).toBe(100)
  })

  it("rounds to one decimal", () => {
    expect(
      calculateRaffleSalesProgress({
        tickets_sold: 1,
        tickets_reserved: 0,
        total_tickets: 3,
      }).percentage,
    ).toBe(33.3)
  })
})
