import { describe, expect, it } from "vitest"
import {
  adminPurchaseCursorFromRow,
  decodeAdminPurchaseCursor,
  encodeAdminPurchaseCursor,
} from "./admin-purchases-cursor"

describe("admin-purchases-cursor", () => {
  it("round-trips cursor encoding", () => {
    const cursor = { createdAtMs: 1_704_000_000_000, id: 42 }
    const encoded = encodeAdminPurchaseCursor(cursor)
    expect(decodeAdminPurchaseCursor(encoded)).toEqual(cursor)
  })

  it("returns null for invalid cursor", () => {
    expect(decodeAdminPurchaseCursor("not-valid")).toBeNull()
    expect(decodeAdminPurchaseCursor("")).toBeNull()
  })

  it("builds cursor from row", () => {
    expect(
      adminPurchaseCursorFromRow({
        id: 7,
        created_at: new Date("2024-01-15T12:00:00.000Z"),
      }),
    ).toEqual({
      createdAtMs: new Date("2024-01-15T12:00:00.000Z").getTime(),
      id: 7,
    })
  })
})
