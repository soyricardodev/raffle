import { describe, expect, it } from "vitest"
import {
  DEFAULT_ADMIN_USER_PREFERENCES,
  mergeAdminUserPreferences,
  parseAdminUserPreferences,
} from "./user-preferences"

describe("parseAdminUserPreferences", () => {
  it("returns defaults when raw is missing or invalid", () => {
    expect(parseAdminUserPreferences(undefined)).toEqual(DEFAULT_ADMIN_USER_PREFERENCES)
    expect(parseAdminUserPreferences(null)).toEqual(DEFAULT_ADMIN_USER_PREFERENCES)
    expect(parseAdminUserPreferences("")).toEqual(DEFAULT_ADMIN_USER_PREFERENCES)
    expect(parseAdminUserPreferences("not-json")).toEqual(DEFAULT_ADMIN_USER_PREFERENCES)
    expect(parseAdminUserPreferences({ foo: "bar" })).toEqual(DEFAULT_ADMIN_USER_PREFERENCES)
  })

  it("parses valid JSON string", () => {
    const raw = JSON.stringify({
      purchases: { skipApproveConfirm: true, skipTicketAdjustConfirm: false },
    })
    expect(parseAdminUserPreferences(raw)).toEqual({
      purchases: { skipApproveConfirm: true, skipTicketAdjustConfirm: false },
    })
  })

  it("parses valid object", () => {
    expect(
      parseAdminUserPreferences({
        purchases: { skipApproveConfirm: false, skipTicketAdjustConfirm: true },
      }),
    ).toEqual({
      purchases: { skipApproveConfirm: false, skipTicketAdjustConfirm: true },
    })
  })
})

describe("mergeAdminUserPreferences", () => {
  it("merges partial purchase preferences", () => {
    const current = {
      purchases: { skipApproveConfirm: false, skipTicketAdjustConfirm: false },
    }
    expect(mergeAdminUserPreferences(current, { purchases: { skipApproveConfirm: true } })).toEqual({
      purchases: { skipApproveConfirm: true, skipTicketAdjustConfirm: false },
    })
  })

  it("preserves untouched fields", () => {
    const current = {
      purchases: { skipApproveConfirm: true, skipTicketAdjustConfirm: true },
    }
    expect(
      mergeAdminUserPreferences(current, { purchases: { skipTicketAdjustConfirm: false } }),
    ).toEqual({
      purchases: { skipApproveConfirm: true, skipTicketAdjustConfirm: false },
    })
  })
})
