import { describe, expect, it } from "vitest"
import {
  highestSaleMilestone,
  mergePushMilestones,
  newlyReachedSaleMilestones,
  parsePushMilestonesSent,
  serializePushMilestonesSent,
  soldPercent,
} from "./milestones"

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

  it("returns sold_10 at 10%", () => {
    expect(newlyReachedSaleMilestones(100, 1000, [])).toEqual(["sold_10"])
  })

  it("returns remaining_70 at 30% sold", () => {
    expect(newlyReachedSaleMilestones(300, 1000, ["sold_10"])).toEqual(["remaining_70"])
  })

  it("returns remaining_30 at 70% sold", () => {
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
    expect(
      newlyReachedSaleMilestones(500, 1000, ["sold_10", "remaining_70", "sold_50"]),
    ).toEqual([])
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
