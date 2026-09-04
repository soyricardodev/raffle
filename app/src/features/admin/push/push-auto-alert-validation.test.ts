import type { PushAutoAlert } from "@raffle/shared/push"
import { describe, expect, it } from "vitest"
import {
  duplicatePercentMessage,
  findDuplicatePercentAlert,
  orderedAlertIds,
  parsePercentDraft,
} from "./push-auto-alert-validation"

const baseAlert = (overrides: Partial<PushAutoAlert>): PushAutoAlert => ({
  id: 1,
  kind: "percent",
  triggerPercent: 50,
  title: "Mitad",
  body: "",
  enabled: true,
  sortOrder: 10,
  legacyMilestoneId: null,
  ...overrides,
})

describe("parsePercentDraft", () => {
  it("accepts integers 1-100", () => {
    expect(parsePercentDraft("50")).toBe(50)
    expect(parsePercentDraft("1")).toBe(1)
    expect(parsePercentDraft("100")).toBe(100)
  })

  it("rejects invalid values", () => {
    expect(parsePercentDraft("")).toBeNull()
    expect(parsePercentDraft("0")).toBeNull()
    expect(parsePercentDraft("101")).toBeNull()
    expect(parsePercentDraft("12.5")).toBeNull()
  })
})

describe("findDuplicatePercentAlert", () => {
  it("finds another enabled alert with the same percent", () => {
    const alerts = [
      baseAlert({ id: 1, triggerPercent: 30 }),
      baseAlert({ id: 2, triggerPercent: 50 }),
    ]
    expect(
      findDuplicatePercentAlert({
        alerts,
        drafts: {},
        percent: 50,
        excludeId: 3,
      })?.id,
    ).toBe(2)
  })

  it("ignores disabled alerts and drafts", () => {
    const alerts = [baseAlert({ id: 2, triggerPercent: 50, enabled: false })]
    expect(
      findDuplicatePercentAlert({
        alerts,
        drafts: { 2: { triggerPercent: "50", title: "", body: "", enabled: false } },
        percent: 50,
      }),
    ).toBeUndefined()
  })

  it("uses unsaved draft values", () => {
    const alerts = [baseAlert({ id: 2, triggerPercent: 30 })]
    expect(
      findDuplicatePercentAlert({
        alerts,
        drafts: { 2: { triggerPercent: "70", title: "", body: "", enabled: true } },
        percent: 70,
        excludeId: 1,
      })?.id,
    ).toBe(2)
  })
})

describe("duplicatePercentMessage", () => {
  it("mentions the conflicting percent", () => {
    expect(duplicatePercentMessage(30)).toBe("Ya hay un aviso activo al 30%")
  })
})

describe("orderedAlertIds", () => {
  it("keeps new_raffle first and percent alerts after", () => {
    const alerts = [
      baseAlert({ id: 4, kind: "percent", sortOrder: 30 }),
      baseAlert({ id: 1, kind: "new_raffle", triggerPercent: null, sortOrder: 0 }),
      baseAlert({ id: 2, kind: "percent", sortOrder: 10 }),
    ]
    expect(orderedAlertIds(alerts)).toEqual([1, 4, 2])
  })
})
