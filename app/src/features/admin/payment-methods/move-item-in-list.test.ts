import { describe, expect, it } from "vitest"
import { moveItemInList } from "@/features/admin/payment-methods/move-item-in-list"

describe("moveItemInList", () => {
  it("moves an item up and down", () => {
    expect(moveItemInList(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"])
    expect(moveItemInList(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"])
  })

  it("leaves the list unchanged at the edges", () => {
    expect(moveItemInList(["a", "b"], 0, -1)).toEqual(["a", "b"])
    expect(moveItemInList(["a", "b"], 1, 1)).toEqual(["a", "b"])
  })
})
