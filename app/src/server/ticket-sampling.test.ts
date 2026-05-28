import { describe, expect, it } from "vitest"
import { InsufficientTicketsError } from "@raffle/shared/errors"
import { pickFreeTicketNumbers, sampleWithoutReplacement } from "./ticket-sampling"

/** Always picks the highest index in the remaining slice (deterministic, non-flaky). */
const pickLastIndex: (maxExclusive: number) => number = (maxExclusive) => maxExclusive - 1

describe("pickFreeTicketNumbers", () => {
  it("samples from the full free range, not only the lowest prefix", () => {
    const picked = pickFreeTicketNumbers(new Set(), 100, 1, pickLastIndex)
    expect(picked).toEqual([99])
  })

  it("can return high numbers when low numbers are occupied", () => {
    const occupied = new Set([0, 1, 2])
    const picked = pickFreeTicketNumbers(occupied, 100, 1, pickLastIndex)
    expect(picked).toEqual([99])
  })

  it("throws when not enough free tickets", () => {
    const occupied = new Set(Array.from({ length: 99 }, (_, i) => i))
    expect(() => pickFreeTicketNumbers(occupied, 100, 2, pickLastIndex)).toThrow(
      InsufficientTicketsError,
    )
  })
})

describe("sampleWithoutReplacement", () => {
  it("returns an empty array when quantity is zero", () => {
    expect(sampleWithoutReplacement([1, 2, 3], 0, pickLastIndex)).toEqual([])
  })

  it("does not mutate the source array", () => {
    const source = ["a", "b", "c"]
    sampleWithoutReplacement(source, 2, pickLastIndex)
    expect(source).toEqual(["a", "b", "c"])
  })
})
