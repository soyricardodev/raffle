export const PUSH_MILESTONE_IDS = [
  "new_raffle",
  "sold_10",
  "remaining_70",
  "sold_50",
  "remaining_30",
  "remaining_10",
] as const

export type PushMilestoneId = (typeof PUSH_MILESTONE_IDS)[number]

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

export function parsePushMilestonesSent(raw: string | null | undefined): PushMilestoneId[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is PushMilestoneId =>
      PUSH_MILESTONE_IDS.includes(item as PushMilestoneId),
    )
  } catch {
    return []
  }
}

export function serializePushMilestonesSent(ids: readonly PushMilestoneId[]): string {
  return JSON.stringify([...new Set(ids)])
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

export function newlyReachedSaleMilestones(
  occupied: number,
  total: number,
  alreadySent: readonly string[],
): PushMilestoneId[] {
  const percent = soldPercent(occupied, total)
  const sent = new Set(alreadySent)
  return SALE_PUSH_MILESTONES.filter((m) => percent >= m.minPercent && !sent.has(m.id)).map(
    (m) => m.id,
  )
}

/** Prefer the most urgent milestone when several are crossed in one sale. */
export function highestSaleMilestone(ids: readonly PushMilestoneId[]): PushMilestoneId | null {
  for (let i = SALE_PUSH_MILESTONES.length - 1; i >= 0; i--) {
    const id = SALE_PUSH_MILESTONES[i]!.id
    if (ids.includes(id)) return id
  }
  return null
}

export function mergePushMilestones(
  alreadySent: readonly PushMilestoneId[],
  extra: readonly PushMilestoneId[],
): PushMilestoneId[] {
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

export function pushMilestoneCopy(
  milestone: PushMilestoneId,
  raffleName: string,
): { title: string; body: string } {
  return {
    title: PUSH_MILESTONE_TITLES[milestone],
    body: raffleName.trim() || FALLBACK_RAFFLE_NAME,
  }
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

/** Tickets still needed to reach an occupied-percent threshold. */
export function ticketsToReachPercent(occupied: number, total: number, minPercent: number): number {
  if (!Number.isFinite(occupied) || !Number.isFinite(total) || total <= 0) return 0
  const needed = Math.ceil((minPercent / 100) * total)
  return Math.max(0, needed - Math.max(0, occupied))
}

export const PUSH_BROADCAST_KINDS = ["milestone", "promotion", "manual"] as const
export type PushBroadcastKind = (typeof PUSH_BROADCAST_KINDS)[number]

export type PushPlanItemStatus = "sent" | "skipped" | "upcoming"

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
  milestoneId: PushMilestoneId | null
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
  milestoneId: PushMilestoneId,
): PushPlanBroadcast | undefined {
  for (let i = broadcasts.length - 1; i >= 0; i--) {
    const row = broadcasts[i]
    if (row?.kind === "milestone" && row.milestoneId === milestoneId) return row
  }
  return undefined
}

function hasMilestoneLogs(broadcasts: readonly PushPlanBroadcast[]): boolean {
  return broadcasts.some((row) => row.kind === "milestone" && row.milestoneId)
}

export function buildRaffleMilestonePlan(input: {
  raffleName: string
  ticketsSold: number
  ticketsReserved?: number
  totalTickets: number
  milestonesSent: readonly PushMilestoneId[]
  broadcasts: readonly PushPlanBroadcast[]
}): RafflePushPlanItem[] {
  const occupied = occupiedTickets(input.ticketsSold, input.ticketsReserved ?? 0)
  const sentIds = new Set(input.milestonesSent)
  const logged = hasMilestoneLogs(input.broadcasts)
  const items: RafflePushPlanItem[] = PUSH_MILESTONE_IDS.map((id) => {
    const copy = pushMilestoneCopy(id, input.raffleName)
    const log = latestBroadcastForMilestone(input.broadcasts, id)
    const triggerPercent = id === "new_raffle" ? null : saleMilestoneTriggerPercent(id)
    const ticketsRemaining =
      triggerPercent == null
        ? null
        : ticketsToReachPercent(occupied, input.totalTickets, triggerPercent)

    let status: PushPlanItemStatus = "upcoming"
    let sentAt: string | null = null
    let recipientCount: number | null = null

    if (log) {
      status = "sent"
      sentAt = log.createdAt
      recipientCount = log.sent
    } else if (sentIds.has(id)) {
      status = logged ? "skipped" : "sent"
    }

    return {
      key: `milestone:${id}`,
      kind: "milestone" as const,
      milestoneId: id,
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
