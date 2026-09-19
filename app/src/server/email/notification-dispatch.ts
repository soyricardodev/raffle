import { getEnv } from "@/lib/env"
import { getLogger } from "@/lib/logger"
import { loadPurchaseEmailContext } from "@/server/purchase-notifications"
import {
  countProviderRejectionsSince,
  countSentSince,
  getLastSentAt,
  getOldestSentAtSince,
} from "@/server/repositories/email-logs.repository"
import {
  listPendingNotificationPurchases,
  listTicketNumbersByPurchase,
  type PendingNotificationPurchase,
} from "@/server/repositories/notification-dispatch.repository"
import { deliverAndLogEmail } from "./email-delivery"
import { buildEmailForType } from "./email-templates"
import type { BuiltEmail } from "./email-types"

const logger = getLogger()

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** Marker MailBaby writes when it refuses a submission as spam. */
export const RSPAM_MARKER = "rSPAM"

/** Upper bound per call, so an admin action can never become a bulk blast. */
export const DISPATCH_MAX_PER_CALL = 25

export type DispatchSettings = {
  enabled: boolean
  provider: string
  hourlyLimit: number
  dailyLimit: number
  minGapSeconds: number
  breakerWindowMinutes: number
}

export function resolveDispatchSettings(): DispatchSettings {
  const env = getEnv()
  return {
    enabled: env.EMAIL_DISPATCH_ENABLED,
    provider: env.EMAIL_PROVIDER,
    hourlyLimit: env.EMAIL_DISPATCH_HOURLY_LIMIT,
    dailyLimit: env.EMAIL_DISPATCH_DAILY_LIMIT,
    minGapSeconds: env.EMAIL_DISPATCH_MIN_GAP_SECONDS,
    breakerWindowMinutes: env.EMAIL_DISPATCH_BREAKER_WINDOW_MINUTES,
  }
}

export type DispatchGateReason =
  | "ready"
  | "disabled"
  | "provider_is_noop"
  | "provider_rejections"
  | "hourly_budget"
  | "daily_budget"
  | "min_gap"

export type DispatchGate = {
  allowed: boolean
  reason: DispatchGateReason
  nextAllowedAt: string | null
  sentLastHour: number
  sentLastDay: number
  hourlyLimit: number
  dailyLimit: number
  minGapSeconds: number
  rejectionsInWindow: number
  breakerWindowMinutes: number
}

export type DispatchGateDeps = {
  now: () => Date
  settings: () => DispatchSettings
  countSentSince: (params: { since: Date }) => Promise<number>
  countProviderRejectionsSince: (params: { since: Date; marker: string }) => Promise<number>
  getLastSentAt: () => Promise<Date | null>
  getOldestSentAtSince: (since: Date) => Promise<Date | null>
}

const defaultGateDeps: DispatchGateDeps = {
  now: () => new Date(),
  settings: resolveDispatchSettings,
  countSentSince,
  countProviderRejectionsSince,
  getLastSentAt,
  getOldestSentAtSince,
}

/**
 * Decides whether one more message may leave right now. Every refusal carries the
 * reason and, when it is time-based, the moment the caller may retry.
 */
export async function evaluateDispatchGate(
  deps: DispatchGateDeps = defaultGateDeps,
): Promise<DispatchGate> {
  const now = deps.now()
  const settings = deps.settings()

  const hourAgo = new Date(now.getTime() - HOUR_MS)
  const dayAgo = new Date(now.getTime() - DAY_MS)
  const breakerStart = new Date(now.getTime() - settings.breakerWindowMinutes * MINUTE_MS)

  const [sentLastHour, sentLastDay, rejectionsInWindow, lastSentAt, oldestInHour, oldestInDay] =
    await Promise.all([
      deps.countSentSince({ since: hourAgo }),
      deps.countSentSince({ since: dayAgo }),
      settings.breakerWindowMinutes > 0
        ? deps.countProviderRejectionsSince({ since: breakerStart, marker: RSPAM_MARKER })
        : Promise.resolve(0),
      deps.getLastSentAt(),
      deps.getOldestSentAtSince(hourAgo),
      deps.getOldestSentAtSince(dayAgo),
    ])

  const base = {
    sentLastHour,
    sentLastDay,
    hourlyLimit: settings.hourlyLimit,
    dailyLimit: settings.dailyLimit,
    minGapSeconds: settings.minGapSeconds,
    rejectionsInWindow,
    breakerWindowMinutes: settings.breakerWindowMinutes,
  }

  const refuse = (reason: DispatchGateReason, nextAllowedAt: Date | null = null): DispatchGate => ({
    ...base,
    allowed: false,
    reason,
    nextAllowedAt: nextAllowedAt?.toISOString() ?? null,
  })

  if (!settings.enabled) return refuse("disabled")
  if (settings.provider === "noop") return refuse("provider_is_noop")
  if (rejectionsInWindow > 0) return refuse("provider_rejections")

  if (sentLastDay >= settings.dailyLimit) {
    const next = oldestInDay ? new Date(oldestInDay.getTime() + DAY_MS) : null
    return refuse("daily_budget", next && next > now ? next : null)
  }

  if (sentLastHour >= settings.hourlyLimit) {
    const next = oldestInHour ? new Date(oldestInHour.getTime() + HOUR_MS) : null
    return refuse("hourly_budget", next && next > now ? next : null)
  }

  if (lastSentAt && settings.minGapSeconds > 0) {
    const readyAt = new Date(lastSentAt.getTime() + settings.minGapSeconds * 1_000)
    if (readyAt > now) return refuse("min_gap", readyAt)
  }

  return { ...base, allowed: true, reason: "ready", nextAllowedAt: null }
}

export type DispatchRecipient = {
  email: string
  customerName: string
  purchaseIds: Array<number>
  paymentReferences: Array<string>
  ticketCount: number
  totalAmountCents: number
  /** Newest purchase of the group: its details are the truthful reference in the email. */
  referencePurchaseId: number
}

export type DispatchSkipCounts = {
  suppressed: number
  undeliverable: number
  risky: number
  /** Sent anyway: the safety service verifies these inline before delivering. */
  pendingVerification: number
}

export type GroupedPendingNotifications = {
  purchases: number
  recipients: number
  duplicateEmailsAvoided: number
  sendable: Array<DispatchRecipient>
  skipped: DispatchSkipCounts
}

/**
 * Collapses pending purchases into one entry per recipient. A customer who bought six
 * times must receive one email with every ticket, not six near-identical messages.
 */
export function groupPendingNotificationPurchases(
  rows: Array<PendingNotificationPurchase>,
): GroupedPendingNotifications {
  const byEmail = new Map<string, DispatchRecipient>()
  const stateByEmail = new Map<string, PendingNotificationPurchase>()

  for (const row of rows) {
    stateByEmail.set(row.email, row)
    const current = byEmail.get(row.email)
    if (!current) {
      byEmail.set(row.email, {
        email: row.email,
        customerName: row.customerName,
        purchaseIds: [row.purchaseId],
        paymentReferences: row.paymentReference?.trim() ? [row.paymentReference.trim()] : [],
        ticketCount: row.ticketQuantity,
        totalAmountCents: row.totalAmountCents,
        referencePurchaseId: row.purchaseId,
      })
      continue
    }
    current.purchaseIds.push(row.purchaseId)
    if (row.paymentReference?.trim()) current.paymentReferences.push(row.paymentReference.trim())
    current.ticketCount += row.ticketQuantity
    current.totalAmountCents += row.totalAmountCents
    current.referencePurchaseId = row.purchaseId
  }

  const sendable: Array<DispatchRecipient> = []
  const skipped: DispatchSkipCounts = {
    suppressed: 0,
    undeliverable: 0,
    risky: 0,
    pendingVerification: 0,
  }

  for (const recipient of byEmail.values()) {
    const source = stateByEmail.get(recipient.email)
    if (source?.suppressionReason) {
      skipped.suppressed += 1
      continue
    }
    switch (source?.verificationState) {
      case "deliverable":
        sendable.push(recipient)
        break
      case "undeliverable":
        skipped.undeliverable += 1
        break
      case "risky":
        skipped.risky += 1
        break
      default:
        // No cached verdict, or an expired one. deliverAndLogEmail runs the safety
        // service BEFORE sending and blocks anything not deliverable, so passing these
        // through is safe — and it is the only way a fresh backlog can ever drain.
        skipped.pendingVerification += 1
        sendable.push(recipient)
        break
    }
  }

  return {
    purchases: rows.length,
    recipients: byEmail.size,
    duplicateEmailsAvoided: rows.length - byEmail.size,
    sendable,
    skipped,
  }
}

export type DispatchPlan = GroupedPendingNotifications & {
  raffleId: number
  gate: DispatchGate
}

/**
 * Organic notifications go out the moment a purchase is approved, but a bulk approval
 * action turns them into exactly the burst that got this account rejected. When the
 * shared budget is spent, the gap has not elapsed or the breaker tripped, the caller
 * must defer: the purchase keeps no delivered status_update log, so the paced
 * dispatcher picks it up on a later tick.
 */
export async function shouldDeferAutomatedSend(): Promise<DispatchGateReason | null> {
  const gate = await evaluateDispatchGate()
  switch (gate.reason) {
    case "hourly_budget":
    case "daily_budget":
    case "provider_rejections":
    case "min_gap":
      return gate.reason
    default:
      return null
  }
}

/** Read-only view of what a dispatch run would do, including why it would stop. */
export async function planNotificationDispatch(params: {
  raffleId: number
}): Promise<DispatchPlan> {
  const [rows, gate] = await Promise.all([
    listPendingNotificationPurchases(params.raffleId),
    evaluateDispatchGate(),
  ])

  return { raffleId: params.raffleId, gate, ...groupPendingNotificationPurchases(rows) }
}

export type DispatchRunResult = {
  email: string
  purchaseCount: number
  ticketCount: number
  success: boolean
  blocked: boolean
  error: string | null
}

/**
 * Records which purchases a consolidated email covered, so the ledger explains why
 * those purchases never get an individual notification of their own.
 */
function withConsolidatedAudit(built: BuiltEmail, purchaseIds: Array<number>): BuiltEmail {
  return {
    ...built,
    metadata: { ...built.metadata, consolidated_purchase_ids: purchaseIds },
  }
}

export type DispatchRunSummary = {
  raffleId: number
  confirmRequired: boolean
  attempted: number
  sent: number
  failed: number
  blocked: number
  stoppedBy: DispatchGateReason | null
  results: Array<DispatchRunResult>
  gate: DispatchGate
}

/**
 * Sends at most one consolidated email per loop iteration and re-checks the gate
 * before every message. The gap and the budget therefore stop the run by themselves,
 * and the caller controls the pace by calling again later.
 */
export async function runNotificationDispatch(params: {
  raffleId: number
  maxSends?: number
  confirm?: boolean
}): Promise<DispatchRunSummary> {
  const maxSends = Math.min(Math.max(params.maxSends ?? 1, 1), DISPATCH_MAX_PER_CALL)
  const plan = await planNotificationDispatch({ raffleId: params.raffleId })

  if (!params.confirm) {
    return {
      raffleId: params.raffleId,
      confirmRequired: true,
      attempted: 0,
      sent: 0,
      failed: 0,
      blocked: 0,
      stoppedBy: plan.gate.allowed ? null : plan.gate.reason,
      results: [],
      gate: plan.gate,
    }
  }

  const ticketsByPurchase = await listTicketNumbersByPurchase(
    plan.sendable.flatMap((recipient) => recipient.purchaseIds),
  )

  const results: Array<DispatchRunResult> = []
  let stoppedBy: DispatchGateReason | null = null
  let sent = 0
  let failed = 0
  let blocked = 0

  for (const recipient of plan.sendable) {
    if (results.length >= maxSends) break

    const gate = await evaluateDispatchGate()
    if (!gate.allowed) {
      stoppedBy = gate.reason
      break
    }

    const context = await loadPurchaseEmailContext(recipient.referencePurchaseId)
    if (!context) {
      failed += 1
      results.push({
        email: recipient.email,
        purchaseCount: recipient.purchaseIds.length,
        ticketCount: recipient.ticketCount,
        success: false,
        blocked: false,
        error: "missing_purchase_context",
      })
      continue
    }

    const ticketNumbers = recipient.purchaseIds.flatMap(
      (purchaseId) => ticketsByPurchase.get(purchaseId) ?? [],
    )
    const ticketCount = ticketNumbers.length || recipient.ticketCount

    const built = await buildEmailForType(
      "status_update",
      {
        ...context,
        ticketNumbers,
        ticketQuantity: ticketCount,
        totalAmountCents: recipient.totalAmountCents,
        aggregatedPurchases: {
          purchaseCount: recipient.purchaseIds.length,
          ticketCount,
          totalAmountCents: recipient.totalAmountCents,
          references: recipient.paymentReferences,
        },
      },
      { status: "approved" },
    )

    const delivery = await deliverAndLogEmail({
      to: recipient.email,
      built: withConsolidatedAudit(built, recipient.purchaseIds),
      purchaseId: recipient.referencePurchaseId,
      idempotencyKey: `status_update:consolidated:${params.raffleId}:${recipient.referencePurchaseId}`,
    })

    if (delivery.success) sent += 1
    else if (delivery.blocked) blocked += 1
    else failed += 1

    results.push({
      email: recipient.email,
      purchaseCount: recipient.purchaseIds.length,
      ticketCount,
      success: delivery.success,
      blocked: Boolean(delivery.blocked),
      error: delivery.error ?? null,
    })

    if (!delivery.success && !delivery.blocked) break
  }

  const finalGate = await evaluateDispatchGate()
  logger.info(
    {
      raffleId: params.raffleId,
      sent,
      failed,
      blocked,
      stoppedBy,
      reason: finalGate.reason,
    },
    "email:dispatch_run",
  )

  return {
    raffleId: params.raffleId,
    confirmRequired: false,
    attempted: results.length,
    sent,
    failed,
    blocked,
    stoppedBy,
    results,
    gate: finalGate,
  }
}
