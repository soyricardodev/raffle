import { describe, expect, it } from "vitest"
import { buildVerifyHref } from "@/features/verify/build-verify-href"

describe("buildVerifyHref", () => {
  it("returns bare /verificar when no options", () => {
    expect(buildVerifyHref()).toEqual({ to: "/verificar", search: {} })
  })

  it("includes phone and auto search flag", () => {
    expect(buildVerifyHref({ phone: "04121231231", auto: true })).toEqual({
      to: "/verificar",
      search: { phone: "04121231231", auto: true },
    })
  })

  it("trims phone before adding to search", () => {
    expect(buildVerifyHref({ phone: "  0412  " })).toEqual({
      to: "/verificar",
      search: { phone: "0412" },
    })
  })
})
