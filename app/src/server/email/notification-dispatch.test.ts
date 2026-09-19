import { describe, expect, it, vi } from "vitest"

const {
  listPendingNotificationPurchases,
  listTicketNumbersByPurchase,
  countSentSince,
  countProviderRejectionsSince,
  getLastSentAt,
  getOldestSentAtSince,
  deliverAndLogEmail,
  buildEmailForType,
  loadPurchaseEmailContext,
} = vi.hoisted(() => ({
  listPendingNotificationPurchases: vi.fn(),
  listTicketNumbersByPurchase: vi.fn(),
  countSentSince: vi.fn(),
  countProviderRejectionsSince: vi.fn(),
  getLastSentAt: vi.fn(),
  getOldestSentAtSince: vi.fn(),
  deliverAndLogEmail: vi.fn(),
  buildEmailForType: vi.fn(),
  loadPurchaseEmailContext: vi.fn(),
}))

vi.mock("@/lib/logger", () => ({
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))
vi.mock("@/server/repositories/notification-dispatch.repository", () => ({
  listPendingNotificationPurchases,
  listTicketNumbersByPurchase,
}))
vi.mock("@/server/repositories/email-logs.repository", () => ({
  countSentSince,
  countProviderRejectionsSince,
  getLastSentAt,
  getOldestSentAtSince,
}))
vi.mock("./email-delivery", () => ({ deliverAndLogEmail }))
vi.mock("./email-templates", () => ({ buildEmailForType }))
vi.mock("@/server/purchase-notifications", () => ({ loadPurchaseEmailContext }))

import type { PendingNotificationPurchase } from "@/server/repositories/notification-dispatch.repository"
import {
  type DispatchGateDeps,
  type DispatchSettings,
  evaluateDispatchGate,
  groupPendingNotificationPurchases,
} from "./notification-dispatch"

const NOW = new Date("2026-09-19T12:00:00.000Z")
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const readySettings: DispatchSettings = {
  enabled: true,
  provider: "smtp",
  hourlyLimit: 20,
  dailyLimit: 150,
  minGapSeconds: 30,
  breakerWindowMinutes: 60,
}

function makeGateDeps(overrides: Partial<DispatchGateDeps> = {}): DispatchGateDeps {
  return {
    now: () => NOW,
    settings: () => readySettings,
    countSentSince: async () => 0,
    countProviderRejectionsSince: async () => 0,
    getLastSentAt: async () => null,
    getOldestSentAtSince: async () => null,
    ...overrides,
  }
}

function pending(
  purchaseId: number,
  email: string,
  overrides: Partial<PendingNotificationPurchase> = {},
): PendingNotificationPurchase {
  return {
    purchaseId,
    email,
    customerName: "Cliente",
    paymentReference: `REF-${purchaseId}`,
    ticketQuantity: 2,
    totalAmountCents: 1000,
    verificationState: "deliverable",
    suppressionReason: null,
    ...overrides,
  }
}

describe("evaluateDispatchGate", () => {
  it("stays closed while dispatch is disabled, even with a healthy provider", async () => {
    const gate = await evaluateDispatchGate(
      makeGateDeps({ settings: () => ({ ...readySettings, enabled: false }) }),
    )

    expect(gate.allowed).toBe(false)
    expect(gate.reason).toBe("disabled")
  })

  it("refuses to count a noop provider as delivery", async () => {
    const gate = await evaluateDispatchGate(
      makeGateDeps({ settings: () => ({ ...readySettings, provider: "noop" }) }),
    )

    expect(gate.allowed).toBe(false)
    expect(gate.reason).toBe("provider_is_noop")
  })

  it("trips the breaker on a single provider rejection inside the window", async () => {
    const gate = await evaluateDispatchGate(
      makeGateDeps({ countProviderRejectionsSince: async () => 1 }),
    )

    expect(gate.allowed).toBe(false)
    expect(gate.reason).toBe("provider_rejections")
    expect(gate.rejectionsInWindow).toBe(1)
  })

  it("holds the hourly budget and reports when capacity frees up", async () => {
    const oldestInHour = new Date(NOW.getTime() - 10 * 60 * 1000)
    const gate = await evaluateDispatchGate(
      makeGateDeps({
        countSentSince: async ({ since }) => (since.getTime() > NOW.getTime() - DAY_MS ? 20 : 20),
        getOldestSentAtSince: async (since) =>
          since.getTime() > NOW.getTime() - DAY_MS ? oldestInHour : null,
      }),
    )

    expect(gate.allowed).toBe(false)
    expect(gate.reason).toBe("hourly_budget")
    expect(gate.nextAllowedAt).toBe(new Date(oldestInHour.getTime() + HOUR_MS).toISOString())
  })

  it("holds the daily budget even when the last hour is quiet", async () => {
    const oldestInDay = new Date(NOW.getTime() - 2 * HOUR_MS)
    const gate = await evaluateDispatchGate(
      makeGateDeps({
        countSentSince: async ({ since }) => (since.getTime() > NOW.getTime() - DAY_MS ? 1 : 150),
        getOldestSentAtSince: async (since) =>
          since.getTime() > NOW.getTime() - DAY_MS ? null : oldestInDay,
      }),
    )

    expect(gate.allowed).toBe(false)
    expect(gate.reason).toBe("daily_budget")
    expect(gate.nextAllowedAt).toBe(new Date(oldestInDay.getTime() + DAY_MS).toISOString())
  })

  it("enforces the minimum gap between two messages", async () => {
    const lastSentAt = new Date(NOW.getTime() - 10 * 1000)
    const gate = await evaluateDispatchGate(makeGateDeps({ getLastSentAt: async () => lastSentAt }))

    expect(gate.allowed).toBe(false)
    expect(gate.reason).toBe("min_gap")
    expect(gate.nextAllowedAt).toBe(new Date(lastSentAt.getTime() + 30_000).toISOString())
  })

  it("allows exactly one message once the gap has elapsed and budgets are clear", async () => {
    const gate = await evaluateDispatchGate(
      makeGateDeps({
        getLastSentAt: async () => new Date(NOW.getTime() - 31 * 1000),
        countSentSince: async () => 3,
      }),
    )

    expect(gate.allowed).toBe(true)
    expect(gate.reason).toBe("ready")
    expect(gate.nextAllowedAt).toBeNull()
  })
})

describe("groupPendingNotificationPurchases", () => {
  it("collapses repeated purchases of one customer into a single email", () => {
    const grouped = groupPendingNotificationPurchases([
      pending(1, "ana@example.com"),
      pending(2, "ana@example.com", { ticketQuantity: 3, totalAmountCents: 2500 }),
      pending(3, "ana@example.com", { ticketQuantity: 1 }),
      pending(4, "luis@example.com"),
    ])

    expect(grouped.purchases).toBe(4)
    expect(grouped.recipients).toBe(2)
    expect(grouped.duplicateEmailsAvoided).toBe(2)

    const ana = grouped.sendable.find((recipient) => recipient.email === "ana@example.com")
    expect(ana?.purchaseIds).toEqual([1, 2, 3])
    expect(ana?.ticketCount).toBe(6)
    expect(ana?.totalAmountCents).toBe(4500)
    expect(ana?.paymentReferences).toEqual(["REF-1", "REF-2", "REF-3"])
    expect(ana?.referencePurchaseId).toBe(3)
  })

  it("never sends to a suppressed recipient", () => {
    const grouped = groupPendingNotificationPurchases([
      pending(1, "blocked@example.com", {
        verificationState: "undeliverable",
        suppressionReason: "mailbox_not_found",
      }),
      pending(2, "ok@example.com"),
    ])

    expect(grouped.skipped.suppressed).toBe(1)
    expect(grouped.sendable.map((recipient) => recipient.email)).toEqual(["ok@example.com"])
  })

  it("holds risky, unknown and unverified recipients instead of guessing", () => {
    const grouped = groupPendingNotificationPurchases([
      pending(1, "risky@example.com", { verificationState: "risky" }),
      pending(2, "unknown@example.com", { verificationState: "unknown" }),
      pending(3, "fresh@example.com", { verificationState: null }),
      pending(4, "undeliverable@example.com", { verificationState: "undeliverable" }),
    ])

    expect(grouped.sendable).toHaveLength(0)
    expect(grouped.skipped).toEqual({
      suppressed: 0,
      undeliverable: 1,
      risky: 1,
      unverified: 2,
    })
  })
})
