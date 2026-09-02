import { describe, expect, it } from "vitest"
import {
  buildRaffleMilestonePlan,
  buildRafflePromotionPlan,
  highestSaleMilestone,
  mergePushMilestones,
  newlyReachedSaleMilestones,
  occupiedTickets,
  parsePushMilestonesSent,
  serializePushMilestonesSent,
  soldPercent,
  ticketsToReachPercent,
} from "./milestones"

describe("occupiedTickets", () => {
  it("sums sold and reserved, ignoring invalid values", () => {
    expect(occupiedTickets(30, 20)).toBe(50)
    expect(occupiedTickets(-4, 10)).toBe(10)
    expect(occupiedTickets(Number.NaN, 8)).toBe(8)
  })
})

describe("soldPercent", () => {
  it("returns 0 for invalid totals", () => {
    expect(soldPercent(10, 0)).toBe(0)
    expect(soldPercent(10, -1)).toBe(0)
  })

  it("computes exact percent", () => {
    expect(soldPercent(100, 1000)).toBe(10)
    expect(soldPercent(900, 1000)).toBe(90)
  })
})

describe("newlyReachedSaleMilestones", () => {
  it("returns nothing below 10%", () => {
    expect(newlyReachedSaleMilestones(99, 1000, [])).toEqual([])
  })

  it("returns sold_10 at 10% occupied", () => {
    expect(newlyReachedSaleMilestones(100, 1000, [])).toEqual(["sold_10"])
  })

  it("returns remaining_70 at 30% occupied", () => {
    expect(newlyReachedSaleMilestones(300, 1000, ["sold_10"])).toEqual(["remaining_70"])
  })

  it("returns remaining_30 at 70% occupied", () => {
    expect(newlyReachedSaleMilestones(700, 1000, ["sold_10", "remaining_70", "sold_50"])).toEqual([
      "remaining_30",
    ])
  })

  it("returns all crossed milestones when jumping", () => {
    expect(newlyReachedSaleMilestones(500, 1000, [])).toEqual([
      "sold_10",
      "remaining_70",
      "sold_50",
    ])
    expect(newlyReachedSaleMilestones(900, 1000, [])).toEqual([
      "sold_10",
      "remaining_70",
      "sold_50",
      "remaining_30",
      "remaining_10",
    ])
  })

  it("skips milestones already sent", () => {
    expect(newlyReachedSaleMilestones(900, 1000, ["sold_10", "sold_50"])).toEqual([
      "remaining_70",
      "remaining_30",
      "remaining_10",
    ])
    expect(newlyReachedSaleMilestones(500, 1000, ["sold_10", "remaining_70", "sold_50"])).toEqual(
      [],
    )
  })
})

describe("highestSaleMilestone", () => {
  it("picks the most urgent crossed milestone", () => {
    expect(highestSaleMilestone(["sold_10", "sold_50", "remaining_10"])).toBe("remaining_10")
    expect(highestSaleMilestone(["sold_10", "remaining_70", "sold_50"])).toBe("sold_50")
    expect(highestSaleMilestone(["sold_10", "remaining_70"])).toBe("remaining_70")
    expect(highestSaleMilestone(["sold_10"])).toBe("sold_10")
    expect(highestSaleMilestone([])).toBeNull()
  })
})

describe("parse/serialize push milestones", () => {
  it("round-trips valid ids", () => {
    const ids = ["new_raffle", "sold_10"] as const
    expect(parsePushMilestonesSent(serializePushMilestonesSent(ids))).toEqual([...ids])
  })

  it("drops unknown values and invalid JSON", () => {
    expect(parsePushMilestonesSent('["sold_10","nope"]')).toEqual(["sold_10"])
    expect(parsePushMilestonesSent("not-json")).toEqual([])
    expect(parsePushMilestonesSent(null)).toEqual([])
  })

  it("merges without duplicates", () => {
    expect(mergePushMilestones(["sold_10"], ["sold_10", "sold_50"])).toEqual(["sold_10", "sold_50"])
  })
})

describe("ticketsToReachPercent", () => {
  it("counts tickets until the threshold", () => {
    expect(ticketsToReachPercent(50, 100, 70)).toBe(20)
    expect(ticketsToReachPercent(70, 100, 70)).toBe(0)
    expect(ticketsToReachPercent(0, 1000, 10)).toBe(100)
  })
})

describe("buildRaffleMilestonePlan", () => {
  it("marks skipped intermediates when a higher send was logged", () => {
    const items = buildRaffleMilestonePlan({
      raffleName: "iPhone 16",
      ticketsSold: 60,
      totalTickets: 100,
      milestonesSent: ["sold_10", "remaining_70", "sold_50"],
      broadcasts: [
        {
          kind: "milestone",
          milestoneId: "sold_50",
          promotionId: null,
          title: "Último 50% disponible.",
          body: "iPhone 16",
          sent: 24,
          createdAt: "2026-09-01T12:00:00.000Z",
        },
      ],
    })

    expect(items.find((row) => row.milestoneId === "sold_10")?.status).toBe("skipped")
    expect(items.find((row) => row.milestoneId === "remaining_70")?.status).toBe("skipped")
    const sold50 = items.find((row) => row.milestoneId === "sold_50")
    expect(sold50?.status).toBe("sent")
    expect(sold50?.recipientCount).toBe(24)
    expect(items.find((row) => row.milestoneId === "new_raffle")).toMatchObject({
      status: "upcoming",
      isNext: true,
    })
    const nextSale = items.find((row) => row.milestoneId === "remaining_30")
    expect(nextSale?.status).toBe("upcoming")
    expect(nextSale?.ticketsRemaining).toBe(10)
  })

  it("counts reserved tickets toward occupancy", () => {
    const items = buildRaffleMilestonePlan({
      raffleName: "iPhone 16",
      ticketsSold: 8,
      ticketsReserved: 22,
      totalTickets: 100,
      milestonesSent: ["sold_10"],
      broadcasts: [],
    })
    expect(items.find((row) => row.milestoneId === "remaining_70")?.status).toBe("upcoming")
    expect(items.find((row) => row.milestoneId === "remaining_70")?.ticketsRemaining).toBe(0)
    expect(items.find((row) => row.milestoneId === "sold_50")?.ticketsRemaining).toBe(20)
  })

  it("treats claimed milestones as sent when there is no log yet", () => {
    const items = buildRaffleMilestonePlan({
      raffleName: "iPhone 16",
      ticketsSold: 12,
      totalTickets: 100,
      milestonesSent: ["new_raffle", "sold_10"],
      broadcasts: [],
    })
    expect(items.find((row) => row.milestoneId === "new_raffle")?.status).toBe("sent")
    expect(items.find((row) => row.milestoneId === "sold_10")?.status).toBe("sent")
    expect(items.find((row) => row.milestoneId === "sold_10")?.recipientCount).toBeNull()
  })
})

describe("buildRafflePromotionPlan", () => {
  it("lists sent promos and active ones still waiting", () => {
    const items = buildRafflePromotionPlan({
      raffleName: "iPhone 16",
      promotions: [
        { id: 1, name: "20% de descuento", isActive: true },
        { id: 2, name: "Precio especial", isActive: true },
        { id: 3, name: "Vieja", isActive: false },
      ],
      broadcasts: [
        {
          kind: "promotion",
          milestoneId: null,
          promotionId: 1,
          title: "Hay una promo.",
          body: "20% de descuento",
          sent: 18,
          createdAt: "2026-09-02T10:00:00.000Z",
        },
      ],
    })
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ promotionId: 1, status: "sent", recipientCount: 18 })
    expect(items[1]).toMatchObject({ promotionId: 2, status: "upcoming", isNext: true })
  })
})
