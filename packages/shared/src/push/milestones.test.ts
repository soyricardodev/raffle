import { describe, expect, it } from "vitest"
import {
  alertMilestoneKey,
  buildRaffleMilestonePlan,
  buildRafflePromotionPlan,
  DEFAULT_PUSH_AUTO_ALERTS,
  highestSaleAlert,
  highestSaleMilestone,
  keepLatestSaleProgressPerRaffle,
  mergePushMilestones,
  newlyReachedSaleAlerts,
  newlyReachedSaleMilestones,
  occupiedTickets,
  parsePushMilestonesSent,
  saleProgressPushTag,
  serializePushMilestonesSent,
  soldPercent,
  ticketsToReachPercent,
} from "./milestones"

const TEST_ALERTS = DEFAULT_PUSH_AUTO_ALERTS.map((alert, index) => ({
  ...alert,
  id: index + 1,
}))

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

describe("newlyReachedSaleAlerts", () => {
  it("returns nothing below 10%", () => {
    expect(newlyReachedSaleAlerts(99, 1000, [], TEST_ALERTS)).toEqual([])
  })

  it("returns sold_10 at 10% occupied", () => {
    expect(newlyReachedSaleAlerts(100, 1000, [], TEST_ALERTS)).toEqual([
      expect.objectContaining({ legacyMilestoneId: "sold_10" }),
    ])
  })
})

describe("highestSaleAlert", () => {
  it("picks the most urgent crossed alert", () => {
    const sold10 = TEST_ALERTS.find((alert) => alert.legacyMilestoneId === "sold_10")!
    const sold50 = TEST_ALERTS.find((alert) => alert.legacyMilestoneId === "sold_50")!
    const remaining10 = TEST_ALERTS.find((alert) => alert.legacyMilestoneId === "remaining_10")!
    expect(highestSaleAlert([sold10, sold50, remaining10])).toEqual(remaining10)
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

  it("drops invalid JSON and keeps milestone keys", () => {
    expect(parsePushMilestonesSent('["sold_10","alert:9"]')).toEqual(["sold_10", "alert:9"])
    expect(parsePushMilestonesSent("not-json")).toEqual([])
    expect(parsePushMilestonesSent(null)).toEqual([])
  })

  it("merges without duplicates", () => {
    expect(mergePushMilestones(["sold_10"], ["sold_10", "sold_50"])).toEqual(["sold_10", "sold_50"])
  })
})

describe("saleProgressPushTag", () => {
  it("is unique per raffle and milestone so webpush does not replace", () => {
    expect(saleProgressPushTag(9, "alert:3")).toBe("raffle-9-alert:3")
    expect(saleProgressPushTag(9, "alert:4")).not.toBe(saleProgressPushTag(9, "alert:3"))
  })
})

describe("keepLatestSaleProgressPerRaffle", () => {
  const row = (
    patch: Partial<{
      kind: string
      raffleId: number | null
      milestoneId: string | null
      tag: string
      title: string
    }>,
  ) => ({
    kind: "milestone",
    raffleId: 1,
    milestoneId: "alert:3",
    tag: "raffle-1-alert:3",
    title: "Último 70% disponible.",
    ...patch,
  })

  it("keeps only the newest sale-progress aviso of the live raffle", () => {
    const visible = keepLatestSaleProgressPerRaffle(
      [
        row({ milestoneId: "alert:5", tag: "raffle-1-alert:5", title: "Último 30% disponible." }),
        row({ milestoneId: "alert:3", tag: "raffle-1-alert:3", title: "Último 70% disponible." }),
        row({
          kind: "promotion",
          milestoneId: null,
          tag: "raffle-1-promo-2",
          title: "Hay una promo.",
        }),
        row({
          kind: "milestone",
          raffleId: 1,
          milestoneId: "alert:1",
          tag: "raffle-1-new",
          title: "Nueva bendición liberada.",
        }),
      ],
      1,
    )
    expect(visible.map((item) => item.title)).toEqual([
      "Último 30% disponible.",
      "Hay una promo.",
      "Nueva bendición liberada.",
    ])
  })

  it("hides sale-progress avisos from raffles that are no longer current", () => {
    const rows = [
      row({
        raffleId: 2,
        milestoneId: "remaining_10",
        tag: "raffle-2-remaining_10",
        title: "10% Equipa",
      }),
      row({
        raffleId: 2,
        milestoneId: "remaining_30",
        tag: "raffle-2-remaining_30",
        title: "30% Equipa",
      }),
      row({
        raffleId: 1,
        milestoneId: "remaining_70",
        tag: "raffle-1-remaining_70",
        title: "70% Baratica",
      }),
      row({
        raffleId: 1,
        milestoneId: "sold_10",
        tag: "raffle-1-sold_10",
        title: "10% Baratica",
      }),
    ]
    expect(keepLatestSaleProgressPerRaffle(rows, 1).map((item) => item.title)).toEqual([
      "70% Baratica",
    ])
    expect(keepLatestSaleProgressPerRaffle(rows, 2).map((item) => item.title)).toEqual([
      "10% Equipa",
    ])
    expect(keepLatestSaleProgressPerRaffle(rows, null)).toEqual([])
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
    const sold50 = TEST_ALERTS.find((alert) => alert.legacyMilestoneId === "sold_50")!
    const items = buildRaffleMilestonePlan({
      raffleName: "iPhone 16",
      ticketsSold: 60,
      totalTickets: 100,
      milestonesSent: ["sold_10", "remaining_70", "sold_50"],
      broadcasts: [
        {
          kind: "milestone",
          milestoneId: alertMilestoneKey(sold50.id),
          promotionId: null,
          title: "Último 50% disponible.",
          body: "iPhone 16",
          sent: 24,
          createdAt: "2026-09-01T12:00:00.000Z",
        },
      ],
      alerts: TEST_ALERTS,
    })

    expect(items.find((row) => row.milestoneId === alertMilestoneKey(2))?.status).toBe("skipped")
    expect(items.find((row) => row.milestoneId === alertMilestoneKey(3))?.status).toBe("skipped")
    const sold50Item = items.find((row) => row.milestoneId === alertMilestoneKey(sold50.id))
    expect(sold50Item?.status).toBe("sent")
    expect(sold50Item?.recipientCount).toBe(24)
    expect(items.find((row) => row.milestoneId === alertMilestoneKey(1))).toMatchObject({
      status: "upcoming",
      isNext: true,
    })
    const nextSale = items.find((row) => row.milestoneId === alertMilestoneKey(5))
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
      alerts: TEST_ALERTS,
    })
    expect(items.find((row) => row.milestoneId === alertMilestoneKey(3))?.status).toBe("upcoming")
    expect(items.find((row) => row.milestoneId === alertMilestoneKey(3))?.ticketsRemaining).toBe(0)
    expect(items.find((row) => row.milestoneId === alertMilestoneKey(4))?.ticketsRemaining).toBe(20)
  })

  it("treats claimed milestones as sent when there is no log yet", () => {
    const items = buildRaffleMilestonePlan({
      raffleName: "iPhone 16",
      ticketsSold: 12,
      totalTickets: 100,
      milestonesSent: ["new_raffle", "sold_10"],
      broadcasts: [],
      alerts: TEST_ALERTS,
    })
    expect(items.find((row) => row.milestoneId === alertMilestoneKey(1))?.status).toBe("sent")
    expect(items.find((row) => row.milestoneId === alertMilestoneKey(2))?.status).toBe("sent")
    expect(items.find((row) => row.milestoneId === alertMilestoneKey(2))?.recipientCount).toBeNull()
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
