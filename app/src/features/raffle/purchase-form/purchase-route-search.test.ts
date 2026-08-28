import { describe, expect, it } from "vitest"
import { parsePurchaseRouteSearchInput } from "@/features/raffle/purchase-form/purchase-route-search"

describe("parsePurchaseRouteSearchInput", () => {
  it("treats 1 and true as norecordar", () => {
    expect(parsePurchaseRouteSearchInput({ norecordar: "1" })).toEqual({ norecordar: true })
    expect(parsePurchaseRouteSearchInput({ norecordar: "true" })).toEqual({ norecordar: true })
    expect(parsePurchaseRouteSearchInput({ norecordar: 1 })).toEqual({ norecordar: true })
    expect(parsePurchaseRouteSearchInput({ norecordar: true })).toEqual({ norecordar: true })
  })

  it("omits the flag when missing or falsy", () => {
    expect(parsePurchaseRouteSearchInput({})).toEqual({})
    expect(parsePurchaseRouteSearchInput({ norecordar: "0" })).toEqual({})
    expect(parsePurchaseRouteSearchInput({ norecordar: "false" })).toEqual({})
  })

  it("accepts previewSuccess for local drawer review", () => {
    expect(parsePurchaseRouteSearchInput({ previewSuccess: "1" })).toEqual({
      previewSuccess: true,
    })
    expect(parsePurchaseRouteSearchInput({ previewSuccess: "false" })).toEqual({})
  })
})
