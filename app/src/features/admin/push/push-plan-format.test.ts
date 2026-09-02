import { describe, expect, it } from "vitest"
import {
  formatPlanItemDetail,
  formatPushRecipients,
  formatSoldPercent,
  formatTicketsRemaining,
} from "./push-plan-format"

describe("formatPushRecipients", () => {
  it("labels one vs many phones", () => {
    expect(formatPushRecipients(null)).toBeNull()
    expect(formatPushRecipients(1)).toBe("1 teléfono")
    expect(formatPushRecipients(24)).toBe("24 teléfonos")
  })
})

describe("formatTicketsRemaining", () => {
  it("uses singular and plural", () => {
    expect(formatTicketsRemaining(0)).toBe("Ya se cruzó")
    expect(formatTicketsRemaining(1)).toBe("Falta 1 boleto")
    expect(formatTicketsRemaining(80)).toBe("Faltan 80 boletos")
  })
})

describe("formatSoldPercent", () => {
  it("drops trailing zeros", () => {
    expect(formatSoldPercent(60)).toBe("60%")
    expect(formatSoldPercent(12.5)).toBe("12.5%")
  })
})

describe("formatPlanItemDetail", () => {
  it("keeps the secondary line short", () => {
    expect(
      formatPlanItemDetail({
        kind: "milestone",
        status: "sent",
        triggerPercent: 50,
        ticketsRemaining: null,
        recipientCount: 18,
      }),
    ).toBe("18 teléfonos")
    expect(
      formatPlanItemDetail({
        kind: "milestone",
        status: "skipped",
        triggerPercent: 10,
        ticketsRemaining: null,
        recipientCount: null,
      }),
    ).toBe("Omitida")
    expect(
      formatPlanItemDetail({
        kind: "milestone",
        status: "upcoming",
        triggerPercent: 70,
        ticketsRemaining: 80,
        recipientCount: null,
      }),
    ).toBe("Faltan 80 boletos")
  })
})
