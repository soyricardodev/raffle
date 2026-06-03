import { describe, expect, it } from "vitest"
import {
  chunkTicketRows,
  getHiddenTicketCount,
  getTicketListDisplayMode,
  getVisibleTicketNumbers,
  TICKET_GRID_COLUMNS,
  TICKET_VIRTUALIZE_AT,
} from "@/features/raffle/purchase-form/purchase-success-tickets"

describe("purchase-success-tickets", () => {
  const many = Array.from({ length: 191 }, (_, i) => String(i).padStart(4, "0"))

  it("chunks tickets into grid rows", () => {
    const rows = chunkTicketRows(many, TICKET_GRID_COLUMNS)
    expect(rows).toHaveLength(Math.ceil(191 / TICKET_GRID_COLUMNS))
  })

  it("uses preview when collapsed with many tickets", () => {
    expect(getTicketListDisplayMode(191, false)).toBe("preview")
    expect(getVisibleTicketNumbers(many, "preview")).toHaveLength(10)
    expect(getHiddenTicketCount(191, "preview")).toBe(181)
  })

  it("uses virtual grid when expanded at high counts", () => {
    expect(getTicketListDisplayMode(191, true)).toBe("virtual")
  })

  it("renders all badges inline for moderate expanded lists", () => {
    const count = TICKET_VIRTUALIZE_AT - 1
    expect(getTicketListDisplayMode(count, true)).toBe("all")
    expect(getVisibleTicketNumbers(many.slice(0, count), "all")).toHaveLength(count)
  })
})
