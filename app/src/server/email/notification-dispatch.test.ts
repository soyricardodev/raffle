import { beforeEach, describe, expect, it, vi } from "vitest"

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
  envState,
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
  envState: {
    enabled: false,
    provider: "smtp",
    hourlyLimit: 20,
    dailyLimit: 150,
    minGapSeconds: 30,
    breakerWindowMinutes: 60,
  },
}))

vi.mock("@/lib/logger", () => ({
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    EMAIL_DISPATCH_ENABLED: envState.enabled,
    EMAIL_PROVIDER: envState.provider,
    EMAIL_DISPATCH_HOURLY_LIMIT: envState.hourlyLimit,
    EMAIL_DISPATCH_DAILY_LIMIT: envState.dailyLimit,
    EMAIL_DISPATCH_MIN_GAP_SECONDS: envState.minGapSeconds,
    EMAIL_DISPATCH_BREAKER_WINDOW_MINUTES: envState.breakerWindowMinutes,
  }),
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
  planNotificationDispatch,
  runNotificationDispatch,
  shouldDeferAutomatedSend,
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

  it("skips what can never be delivered and hands the rest to the safety service", () => {
    const grouped = groupPendingNotificationPurchases([
      pending(1, "risky@example.com", { verificationState: "risky" }),
      pending(2, "unknown@example.com", { verificationState: "unknown" }),
      pending(3, "fresh@example.com", { verificationState: null }),
      pending(4, "undeliverable@example.com", { verificationState: "undeliverable" }),
    ])

    expect(grouped.sendable.map((recipient) => recipient.email).sort()).toEqual([
      "fresh@example.com",
      "unknown@example.com",
    ])
    expect(grouped.skipped).toEqual({
      suppressed: 0,
      undeliverable: 1,
      risky: 1,
      pendingVerification: 2,
    })
  })
})

describe("shouldDeferAutomatedSend", () => {
  beforeEach(() => {
    envState.enabled = true
    envState.provider = "smtp"
    countSentSince.mockResolvedValue(0)
    countProviderRejectionsSince.mockResolvedValue(0)
    getLastSentAt.mockResolvedValue(null)
    getOldestSentAtSince.mockResolvedValue(null)
  })

  it("defers once the hourly budget is spent", async () => {
    countSentSince.mockResolvedValue(20)
    await expect(shouldDeferAutomatedSend()).resolves.toBe("hourly_budget")
  })

  it("defers while the breaker holds after a provider rejection", async () => {
    countSentSince.mockResolvedValue(1)
    countProviderRejectionsSince.mockResolvedValue(1)
    await expect(shouldDeferAutomatedSend()).resolves.toBe("provider_rejections")
  })

  it("defers inside the minimum gap so a bulk approval cannot burst", async () => {
    countSentSince.mockResolvedValue(1)
    getLastSentAt.mockResolvedValue(new Date(Date.now() - 5_000))
    await expect(shouldDeferAutomatedSend()).resolves.toBe("min_gap")
  })

  it("does not defer when dispatch pacing is switched off", async () => {
    envState.enabled = false
    await expect(shouldDeferAutomatedSend()).resolves.toBeNull()
  })
})

describe("dispatch fail-safe wiring", () => {
  const referenceContext = {
    purchaseId: 2,
    customerName: "Cliente",
    customerEmail: "ana@example.com",
    customerPhone: "04140000000",
    ticketQuantity: 2,
    totalAmountCents: 1000,
    paymentMethod: "pago_movil",
    paymentMethodLabel: "Pago móvil",
    paymentReference: "REF-2",
    raffleName: "Rifa",
    status: "approved",
  }

  beforeEach(() => {
    envState.enabled = false
    envState.provider = "smtp"
    listPendingNotificationPurchases.mockResolvedValue([
      pending(1, "ana@example.com"),
      pending(2, "ana@example.com"),
    ])
    listTicketNumbersByPurchase.mockResolvedValue(
      new Map([
        [1, ["001", "002"]],
        [2, ["003", "004"]],
      ]),
    )
    loadPurchaseEmailContext.mockResolvedValue(referenceContext)
    buildEmailForType.mockResolvedValue({
      type: "status_update",
      subject: "Compra aprobada",
      html: "<p>ok</p>",
    })
    deliverAndLogEmail.mockResolvedValue({ success: true, logId: 99 })
    countSentSince.mockResolvedValue(0)
    countProviderRejectionsSince.mockResolvedValue(0)
    getLastSentAt.mockResolvedValue(null)
    getOldestSentAtSince.mockResolvedValue(null)
  })

  it("reports the queue and the reason it cannot send yet", async () => {
    const plan = await planNotificationDispatch({ raffleId: 67 })

    expect(plan.purchases).toBe(2)
    expect(plan.recipients).toBe(1)
    expect(plan.duplicateEmailsAvoided).toBe(1)
    expect(plan.sendable).toHaveLength(1)
    expect(plan.gate.reason).toBe("disabled")
  })

  it("sends nothing while dispatch is disabled, even with confirm:true", async () => {
    const summary = await runNotificationDispatch({ raffleId: 67, confirm: true })

    expect(summary.sent).toBe(0)
    expect(summary.stoppedBy).toBe("disabled")
    expect(deliverAndLogEmail).not.toHaveBeenCalled()
  })

  it("refuses to send without confirm", async () => {
    envState.enabled = true
    const summary = await runNotificationDispatch({ raffleId: 67 })

    expect(summary.confirmRequired).toBe(true)
    expect(deliverAndLogEmail).not.toHaveBeenCalled()
  })

  it("sends one consolidated email with every ticket once enabled", async () => {
    envState.enabled = true
    const summary = await runNotificationDispatch({ raffleId: 67, confirm: true })

    expect(summary.sent).toBe(1)
    expect(deliverAndLogEmail).toHaveBeenCalledTimes(1)
    expect(deliverAndLogEmail.mock.calls[0]?.[0]).toMatchObject({ to: "ana@example.com" })

    const emailContext = buildEmailForType.mock.calls[0]?.[1] as {
      ticketNumbers: Array<string>
      aggregatedPurchases: { purchaseCount: number; ticketCount: number; totalAmountCents: number }
    }
    expect(emailContext.ticketNumbers).toEqual(["001", "002", "003", "004"])
    expect(emailContext.aggregatedPurchases).toMatchObject({
      purchaseCount: 2,
      ticketCount: 4,
      totalAmountCents: 2000,
    })
  })
})
