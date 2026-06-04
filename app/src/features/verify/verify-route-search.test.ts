import { describe, expect, it } from "vitest"
import { parseVerifyRouteSearchInput } from "@/features/verify/verify-route-search"

describe("parseVerifyRouteSearchInput", () => {
  it("parses email deep link params", () => {
    expect(parseVerifyRouteSearchInput({ email: " a@b.com " })).toEqual({
      email: "a@b.com",
    })
  })

  it("coerces auto=1 to true", () => {
    expect(parseVerifyRouteSearchInput({ phone: "0412", auto: "1" })).toEqual({
      phone: "0412",
      auto: true,
    })
  })
})
