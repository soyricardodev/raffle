export const PUSH_MILESTONE_IDS = [
  "new_raffle",
  "sold_10",
  "remaining_70",
  "sold_50",
  "remaining_30",
  "remaining_10",
] as const

export type PushMilestoneId = (typeof PUSH_MILESTONE_IDS)[number]

export const PUSH_AUTO_ALERT_KINDS = ["percent", "new_raffle"] as const
export type PushAutoAlertKind = (typeof PUSH_AUTO_ALERT_KINDS)[number]

export type PushAutoAlert = {
  id: number
  kind: PushAutoAlertKind
  triggerPercent: number | null
  title: string
  body: string
  enabled: boolean
  sortOrder: number
  legacyMilestoneId: string | null
}

export const SALE_PUSH_MILESTONES = [
  { id: "sold_10", minPercent: 10 },
  { id: "remaining_70", minPercent: 30 },
  { id: "sold_50", minPercent: 50 },
  { id: "remaining_30", minPercent: 70 },
  { id: "remaining_10", minPercent: 90 },
] as const satisfies ReadonlyArray<{
  id: Exclude<PushMilestoneId, "new_raffle">
  minPercent: number
}>

export const DEFAULT_PUSH_AUTO_ALERTS: ReadonlyArray<
  Omit<PushAutoAlert, "id"> & { legacyMilestoneId: PushMilestoneId }
> = [
  {
    kind: "new_raffle",
    triggerPercent: null,
    title: "Nueva bendición liberada.",
    body: "",
    enabled: true,
    sortOrder: 0,
    legacyMilestoneId: "new_raffle",
  },
  {
    kind: "percent",
    triggerPercent: 10,
    title: "Ya se fue el 10%.",
    body: "",
    enabled: true,
    sortOrder: 10,
    legacyMilestoneId: "sold_10",
  },
  {
    kind: "percent",
    triggerPercent: 30,
    title: "Último 70% disponible.",
    body: "",
    enabled: true,
    sortOrder: 20,
    legacyMilestoneId: "remaining_70",
  },
  {
    kind: "percent",
    triggerPercent: 50,
    title: "Último 50% disponible.",
    body: "",
    enabled: true,
    sortOrder: 30,
    legacyMilestoneId: "sold_50",
  },
  {
    kind: "percent",
    triggerPercent: 70,
    title: "¡Lo que queda! Último 30% disponible.",
    body: "",
    enabled: true,
    sortOrder: 40,
    legacyMilestoneId: "remaining_30",
  },
  {
    kind: "percent",
    triggerPercent: 90,
    title: "¡Última oportunidad! 10% es lo que queda.",
    body: "",
    enabled: true,
    sortOrder: 50,
    legacyMilestoneId: "remaining_10",
  },
]

export function alertMilestoneKey(id: number): string {
  return `alert:${id}`
}

export function parseAlertMilestoneKey(key: string): number | null {
  const match = /^alert:(\d+)$/.exec(key)
  if (!match) return null
  const id = Number(match[1])
  return Number.isInteger(id) && id > 0 ? id : null
}

export function parsePushMilestonesSent(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0)
  } catch {
    return []
  }
}

export function serializePushMilestonesSent(ids: readonly string[]): string {
  return JSON.stringify([...new Set(ids)])
}

export function isAlertAlreadySent(
  alert: Pick<PushAutoAlert, "id" | "legacyMilestoneId">,
  alreadySent: readonly string[],
): boolean {
  const sent = new Set(alreadySent)
  if (sent.has(alertMilestoneKey(alert.id))) return true
  if (alert.legacyMilestoneId && sent.has(alert.legacyMilestoneId)) return true
  return false
}

export function normalizeSentMilestoneKeys(
  alreadySent: readonly string[],
  alerts: readonly PushAutoAlert[],
): string[] {
  const legacyToKey = new Map(
    alerts
      .filter((alert) => alert.legacyMilestoneId)
      .map((alert) => [alert.legacyMilestoneId!, alertMilestoneKey(alert.id)]),
  )
  return [...new Set(alreadySent.map((key) => legacyToKey.get(key) ?? key))]
}

/** Tickets that already count toward raffle progress (sold + reserved). */
export function occupiedTickets(sold: number, reserved: number): number {
  const soldCount = Number.isFinite(sold) ? Math.max(0, sold) : 0
  const reservedCount = Number.isFinite(reserved) ? Math.max(0, reserved) : 0
  return soldCount + reservedCount
}

/** Percent of tickets occupied, sold or reserved (0–100). */
export function soldPercent(occupied: number, total: number): number {
  if (!Number.isFinite(occupied) || !Number.isFinite(total) || total <= 0) return 0
  return (Math.max(0, occupied) / total) * 100
}

export function newlyReachedSaleAlerts(
  occupied: number,
  total: number,
  alreadySent: readonly string[],
  alerts: readonly PushAutoAlert[],
): PushAutoAlert[] {
  const percent = soldPercent(occupied, total)
  return alerts
    .filter((alert) => alert.enabled && alert.kind === "percent" && alert.triggerPercent != null)
    .filter(
      (alert) => percent >= alert.triggerPercent! && !isAlertAlreadySent(alert, alreadySent),
    )
}

/** Prefer the most urgent alert when several are crossed in one sale. */
export function highestSaleAlert(alerts: readonly PushAutoAlert[]): PushAutoAlert | null {
  return alerts.reduce<PushAutoAlert | null>((best, current) => {
    if (!best) return current
    return (current.triggerPercent ?? 0) > (best.triggerPercent ?? 0) ? current : best
  }, null)
}

export function mergePushMilestones(
  alreadySent: readonly string[],
  extra: readonly string[],
): string[] {
  return [...new Set([...alreadySent, ...extra])]
}

export const PUSH_MILESTONE_TITLES: Record<PushMilestoneId, string> = {
  new_raffle: "Nueva bendición liberada.",
  sold_10: "Ya se fue el 10%.",
  remaining_70: "Último 70% disponible.",
  sold_50: "Último 50% disponible.",
  remaining_30: "¡Lo que queda! Último 30% disponible.",
  remaining_10: "¡Última oportunidad! 10% es lo que queda.",
}

const FALLBACK_RAFFLE_NAME = "Yoiber Rifas"

export function pushAlertCopy(
  alert: Pick<PushAutoAlert, "title" | "body">,
  raffleName: string,
): { title: string; body: string } {
  return {
    title: alert.title.trim(),
    body: alert.body.trim() || raffleName.trim() || FALLBACK_RAFFLE_NAME,
  }
}

export function pushMilestoneCopy(
  milestone: PushMilestoneId,
  raffleName: string,
): { title: string; body: string } {
  return pushAlertCopy({ title: PUSH_MILESTONE_TITLES[milestone], body: "" }, raffleName)
}

export function promotionPushCopy(
  promoName: string,
  raffleName: string,
): { title: string; body: string } {
  return {
    title: "Hay una promo.",
    body: promoName.trim() || raffleName.trim() || FALLBACK_RAFFLE_NAME,
  }
}

export function saleMilestoneTriggerPercent(id: Exclude<PushMilestoneId, "new_raffle">): number {
  return SALE_PUSH_MILESTONES.find((m) => m.id === id)?.minPercent ?? 0
}

/** Unique Web Push tag so each % aviso still arrives on the phone. */
export function saleProgressPushTag(raffleId: number, milestoneKey: string): string {
  return `raffle-${raffleId}-${milestoneKey}`
}

export function isSaleProgressBroadcast(row: {
  kind: string
  milestoneId: string | null
  tag: string
}): boolean {
  if (row.kind !== "milestone" || !row.milestoneId) return false
  if (row.milestoneId === "new_raffle") return false
  if (row.tag.endsWith("-new")) return false
  return true
}

/**
 * Inbox-only: keep the latest sale-progress aviso for the live raffle.
 * Older raffles drop out; 50% replaces 30% on the current one.
 */
export function keepLatestSaleProgressPerRaffle<
  T extends {
    kind: string
    raffleId: number | null
    milestoneId: string | null
    tag: string
  },
>(rows: readonly T[], currentRaffleId: number | null): T[] {
  let keptCurrent = false
  const visible: T[] = []
  for (const row of rows) {
    if (isSaleProgressBroadcast(row)) {
      if (currentRaffleId == null || row.raffleId !== currentRaffleId) continue
      if (keptCurrent) continue
      keptCurrent = true
    }
    visible.push(row)
  }
  return visible
}

/** Tickets still needed to reach an occupied-percent threshold. */
export function ticketsToReachPercent(occupied: number, total: number, minPercent: number): number {
  if (!Number.isFinite(occupied) || !Number.isFinite(total) || total <= 0) return 0
  const needed = Math.ceil((minPercent / 100) * total)
  return Math.max(0, needed - Math.max(0, occupied))
}

export const PUSH_BROADCAST_KINDS = ["milestone", "promotion", "manual"] as const
export type PushBroadcastKind = (typeof PUSH_BROADCAST_KINDS)[number]

export type PushPlanItemStatus = "sent" | "skipped" | "upcoming" | "disabled"

export type PushPlanBroadcast = {
  kind: PushBroadcastKind | string
  milestoneId: string | null
  promotionId: number | null
  title: string
  body: string
  sent: number
  createdAt: string
}

export type PushPlanPromotion = {
  id: number
  name: string
  isActive: boolean
}

export type RafflePushPlanItem = {
  key: string
  kind: "milestone" | "promotion"
  alertId: number | null
  milestoneId: string | null
  promotionId: number | null
  title: string
  body: string
  status: PushPlanItemStatus
  triggerPercent: number | null
  ticketsRemaining: number | null
  sentAt: string | null
  recipientCount: number | null
  isNext: boolean
}

function latestBroadcastForMilestone(
  broadcasts: readonly PushPlanBroadcast[],
  milestoneKey: string,
): PushPlanBroadcast | undefined {
  for (let i = broadcasts.length - 1; i >= 0; i--) {
    const row = broadcasts[i]
    if (row?.kind === "milestone" && row.milestoneId === milestoneKey) return row
  }
  return undefined
}

function hasMilestoneLogs(broadcasts: readonly PushPlanBroadcast[]): boolean {
  return broadcasts.some((row) => row.kind === "milestone" && row.milestoneId)
}

function milestoneKeysForAlert(alert: PushAutoAlert): string[] {
  const keys = [alertMilestoneKey(alert.id)]
  if (alert.legacyMilestoneId) keys.push(alert.legacyMilestoneId)
  return keys
}

export function buildRaffleMilestonePlan(input: {
  raffleName: string
  ticketsSold: number
  ticketsReserved?: number
  totalTickets: number
  milestonesSent: readonly string[]
  broadcasts: readonly PushPlanBroadcast[]
  alerts: readonly PushAutoAlert[]
}): RafflePushPlanItem[] {
  const occupied = occupiedTickets(input.ticketsSold, input.ticketsReserved ?? 0)
  const sentIds = new Set(input.milestonesSent)
  const logged = hasMilestoneLogs(input.broadcasts)
  const sortedAlerts = [...input.alerts].sort((a, b) => a.sortOrder - b.sortOrder)

  const items: RafflePushPlanItem[] = sortedAlerts.map((alert) => {
    const milestoneKey = alertMilestoneKey(alert.id)
    const copy = pushAlertCopy(alert, input.raffleName)
    const log =
      latestBroadcastForMilestone(input.broadcasts, milestoneKey) ??
      (alert.legacyMilestoneId
        ? latestBroadcastForMilestone(input.broadcasts, alert.legacyMilestoneId)
        : undefined)
    const triggerPercent = alert.kind === "percent" ? alert.triggerPercent : null
    const ticketsRemaining =
      triggerPercent == null
        ? null
        : ticketsToReachPercent(occupied, input.totalTickets, triggerPercent)

    let status: PushPlanItemStatus = alert.enabled ? "upcoming" : "disabled"
    let sentAt: string | null = null
    let recipientCount: number | null = null

    if (log) {
      status = "sent"
      sentAt = log.createdAt
      recipientCount = log.sent
    } else if (milestoneKeysForAlert(alert).some((key) => sentIds.has(key))) {
      status = logged ? "skipped" : "sent"
    }

    return {
      key: `milestone:${milestoneKey}`,
      kind: "milestone" as const,
      alertId: alert.id,
      milestoneId: milestoneKey,
      promotionId: null,
      title: copy.title,
      body: copy.body,
      status,
      triggerPercent,
      ticketsRemaining: status === "upcoming" ? ticketsRemaining : null,
      sentAt,
      recipientCount,
      isNext: false,
    }
  })

  const next = items.find((item) => item.status === "upcoming")
  if (next) next.isNext = true
  return items
}

export function buildRafflePromotionPlan(input: {
  raffleName: string
  promotions: readonly PushPlanPromotion[]
  broadcasts: readonly PushPlanBroadcast[]
}): RafflePushPlanItem[] {
  const promoBroadcasts = input.broadcasts.filter(
    (row) => row.kind === "promotion" && row.promotionId != null,
  )
  const sentByPromoId = new Map<number, PushPlanBroadcast>()
  for (const row of promoBroadcasts) {
    if (row.promotionId == null) continue
    sentByPromoId.set(row.promotionId, row)
  }

  const items: RafflePushPlanItem[] = []

  for (const [promotionId, row] of sentByPromoId) {
    items.push({
      key: `promotion:${promotionId}`,
      kind: "promotion",
      alertId: null,
      milestoneId: null,
      promotionId,
      title: row.title,
      body: row.body,
      status: "sent",
      triggerPercent: null,
      ticketsRemaining: null,
      sentAt: row.createdAt,
      recipientCount: row.sent,
      isNext: false,
    })
  }

  for (const promo of input.promotions) {
    if (!promo.isActive || sentByPromoId.has(promo.id)) continue
    const copy = promotionPushCopy(promo.name, input.raffleName)
    items.push({
      key: `promotion:${promo.id}`,
      kind: "promotion",
      alertId: null,
      milestoneId: null,
      promotionId: promo.id,
      title: copy.title,
      body: copy.body,
      status: "upcoming",
      triggerPercent: null,
      ticketsRemaining: null,
      sentAt: null,
      recipientCount: null,
      isNext: false,
    })
  }

  const next = items.find((item) => item.status === "upcoming")
  if (next) next.isNext = true
  return items
}

// Backwards-compatible helpers used in older tests/callers.
export function newlyReachedSaleMilestones(
  occupied: number,
  total: number,
  alreadySent: readonly string[],
): PushMilestoneId[] {
  const alerts = DEFAULT_PUSH_AUTO_ALERTS.map((alert, index) => ({
    ...alert,
    id: index + 1,
  }))
  return newlyReachedSaleAlerts(occupied, total, alreadySent, alerts)
    .map((alert) => alert.legacyMilestoneId)
    .filter((id): id is PushMilestoneId => id != null && PUSH_MILESTONE_IDS.includes(id as PushMilestoneId))
}

export function highestSaleMilestone(ids: readonly PushMilestoneId[]): PushMilestoneId | null {
  const byLegacy = new Map(
    DEFAULT_PUSH_AUTO_ALERTS.map((alert, index) => [
      alert.legacyMilestoneId,
      { ...alert, id: index + 1 } satisfies PushAutoAlert,
    ]),
  )
  const alerts: PushAutoAlert[] = []
  for (const id of ids) {
    const alert = byLegacy.get(id)
    if (alert) alerts.push(alert)
  }
  const highest = highestSaleAlert(alerts)
  return (highest?.legacyMilestoneId as PushMilestoneId | undefined) ?? null
}
