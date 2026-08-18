import { describe, expect, it } from "vitest"
import { isExactIdPermutation } from "@/server/payment-accounts.service"

describe("isExactIdPermutation", () => {
  it("accepts the same ids in any order", () => {
    expect(isExactIdPermutation([2, 1], new Set([1, 2]))).toBe(true)
  })

  it("rejects a shorter, duplicated, or unknown list", () => {
    expect(isExactIdPermutation([1], new Set([1, 2]))).toBe(false)
    expect(isExactIdPermutation([1, 1], new Set([1, 2]))).toBe(false)
    expect(isExactIdPermutation([1, 3], new Set([1, 2]))).toBe(false)
  })
})
