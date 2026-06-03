import { describe, expect, it } from "vitest"
import { renderEmailTicketGrid } from "./email-ticket-grid"

const colors = { primary: "#8B7355", secondary: "#F5F5DC", accent: "#FFD700" }

describe("renderEmailTicketGrid", () => {
  it("renders tickets in table cells", () => {
    const html = renderEmailTicketGrid(["87", "190", "398"], colors)
    expect(html).toContain("<td")
    expect(html).toContain("0087")
    expect(html).toContain("0190")
    expect(html).not.toContain("87, 190")
  })

  it("pads numeric tickets to 4 digits", () => {
    const html = renderEmailTicketGrid(["1"], colors)
    expect(html).toContain("0001")
  })
})
