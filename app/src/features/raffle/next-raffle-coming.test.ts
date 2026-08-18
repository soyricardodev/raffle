import { describe, expect, it } from "vitest"
import {
  isRaffleSoldOut,
  shouldShowNextRaffleComingBanner,
} from "@/features/raffle/next-raffle-coming"

const soldOutFinished = {
  status: "finished",
  tickets_sold: 100,
  tickets_reserved: 0,
  total_tickets: 100,
}

describe("isRaffleSoldOut", () => {
  it("is true at 100%", () => {
    expect(isRaffleSoldOut(soldOutFinished)).toBe(true)
  })

  it("is false below 100%", () => {
    expect(
      isRaffleSoldOut({
        tickets_sold: 80,
        tickets_reserved: 0,
        total_tickets: 100,
      }),
    ).toBe(false)
  })
})

describe("shouldShowNextRaffleComingBanner", () => {
  it("always shows when forced", () => {
    expect(
      shouldShowNextRaffleComingBanner({
        force: true,
        hasActiveRaffle: true,
        latestFinished: null,
      }),
    ).toBe(true)
  })

  it("hides when a new raffle is active", () => {
    expect(
      shouldShowNextRaffleComingBanner({
        force: false,
        hasActiveRaffle: true,
        latestFinished: soldOutFinished,
      }),
    ).toBe(false)
  })

  it("shows when the latest raffle is finished", () => {
    expect(
      shouldShowNextRaffleComingBanner({
        force: false,
        hasActiveRaffle: false,
        latestFinished: soldOutFinished,
      }),
    ).toBe(true)
  })

  it("shows a finished raffle even if it is not sold out", () => {
    expect(
      shouldShowNextRaffleComingBanner({
        force: false,
        hasActiveRaffle: false,
        latestFinished: {
          status: "finished",
          tickets_sold: 40,
          tickets_reserved: 0,
          total_tickets: 100,
        },
      }),
    ).toBe(true)
  })

  it("hides when there is no finished raffle", () => {
    expect(
      shouldShowNextRaffleComingBanner({
        force: false,
        hasActiveRaffle: false,
        latestFinished: null,
      }),
    ).toBe(false)
  })
})
