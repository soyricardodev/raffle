import { describe, expect, it } from "vitest"
import { AddRemoveTicketsInput } from "./index.js"

describe("AddRemoveTicketsInput", () => {
  it("accepts quantities within technical per-request limits", () => {
    expect(AddRemoveTicketsInput.parse({ quantity: 1 })).toEqual({ quantity: 1 })
    expect(AddRemoveTicketsInput.parse({ quantity: 500 })).toEqual({ quantity: 500 })
  })

  it("rejects non-positive or oversized quantities", () => {
    expect(() => AddRemoveTicketsInput.parse({ quantity: 0 })).toThrow()
    expect(() => AddRemoveTicketsInput.parse({ quantity: -5 })).toThrow()
    expect(() => AddRemoveTicketsInput.parse({ quantity: 501 })).toThrow()
    expect(() => AddRemoveTicketsInput.parse({ quantity: 1.5 })).toThrow()
  })
})
