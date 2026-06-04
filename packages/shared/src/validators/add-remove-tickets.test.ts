import { describe, expect, it } from "vitest"
import { AddRemoveTicketsInput, PLATFORM_TOTAL_TICKETS } from "./index.js"

describe("AddRemoveTicketsInput", () => {
  it("accepts quantities within platform limits", () => {
    expect(AddRemoveTicketsInput.parse({ quantity: 1 })).toEqual({ quantity: 1 })
    expect(AddRemoveTicketsInput.parse({ quantity: 600 })).toEqual({ quantity: 600 })
    expect(AddRemoveTicketsInput.parse({ quantity: PLATFORM_TOTAL_TICKETS })).toEqual({
      quantity: PLATFORM_TOTAL_TICKETS,
    })
  })

  it("coerces string quantities from JSON", () => {
    expect(AddRemoveTicketsInput.parse({ quantity: "25" })).toEqual({ quantity: 25 })
  })

  it("rejects non-positive or oversized quantities", () => {
    expect(() => AddRemoveTicketsInput.parse({ quantity: 0 })).toThrow()
    expect(() => AddRemoveTicketsInput.parse({ quantity: -5 })).toThrow()
    expect(() => AddRemoveTicketsInput.parse({ quantity: PLATFORM_TOTAL_TICKETS + 1 })).toThrow()
    expect(() => AddRemoveTicketsInput.parse({ quantity: 1.5 })).toThrow()
  })
})
