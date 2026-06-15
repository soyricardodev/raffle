import { describe, expect, it } from "vitest"
import {
  adminRaffleScopeSearchParam,
  getDefaultAdminRaffleId,
  resolveAdminRaffleScopeFromSearch,
} from "@/features/admin/shared/admin-raffle-scope"

describe("resolveAdminRaffleScopeFromSearch", () => {
  it("defaults to the provided current raffle id", () => {
    expect(resolveAdminRaffleScopeFromSearch(undefined, "12")).toBe("12")
  })

  it("uses all raffles when raffle_id is all", () => {
    expect(resolveAdminRaffleScopeFromSearch("all", "12")).toBeNull()
  })

  it("keeps an explicit raffle id from the url", () => {
    expect(resolveAdminRaffleScopeFromSearch("34", "12")).toBe("34")
  })
})

describe("getDefaultAdminRaffleId", () => {
  it("prefers active raffles over paused ones when fallback is enabled", () => {
    expect(
      getDefaultAdminRaffleId(
        {
          filter_raffles: [
            { id: 1, name: "Paused", status: "paused" },
            { id: 2, name: "Active", status: "active" },
          ],
        } as never,
        { includePausedFallback: true },
      ),
    ).toBe("2")
  })

  it("falls back to paused raffle when no active raffle exists", () => {
    expect(
      getDefaultAdminRaffleId(
        {
          filter_raffles: [{ id: 3, name: "Paused", status: "paused" }],
        } as never,
        { includePausedFallback: true },
      ),
    ).toBe("3")
  })

  it("returns null when no active raffle and paused fallback is disabled", () => {
    expect(
      getDefaultAdminRaffleId({
        filter_raffles: [{ id: 3, name: "Paused", status: "paused" }],
      } as never),
    ).toBeNull()
  })
})

describe("adminRaffleScopeSearchParam", () => {
  it("preserves explicit all scope on search", () => {
    expect(adminRaffleScopeSearchParam("all", null, "12")).toBe("all")
  })
})
