export const PUSH_MILESTONE_IDS = ["new_raffle", "sold_10", "sold_50", "remaining_10"] as const

export type PushMilestoneId = (typeof PUSH_MILESTONE_IDS)[number]

export const SALE_PUSH_MILESTONES = [
  { id: "sold_10", minPercent: 10 },
  { id: "sold_50", minPercent: 50 },
  { id: "remaining_10", minPercent: 90 },
] as const satisfies ReadonlyArray<{ id: PushMilestoneId; minPercent: number }>

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

/** Percent of tickets sold (0–100). */
export function soldPercent(sold: number, total: number): number {
  if (!Number.isFinite(sold) || !Number.isFinite(total) || total <= 0) return 0
  return (Math.max(0, sold) / total) * 100
}

export function newlyReachedSaleMilestones(
  sold: number,
  total: number,
  alreadySent: readonly string[],
): PushMilestoneId[] {
  const percent = soldPercent(sold, total)
  const sent = new Set(alreadySent)
  return SALE_PUSH_MILESTONES.filter((m) => percent >= m.minPercent && !sent.has(m.id)).map(
    (m) => m.id,
  )
}

/** Prefer the most urgent milestone when several are crossed in one sale. */
export function highestSaleMilestone(ids: readonly PushMilestoneId[]): PushMilestoneId | null {
  if (ids.includes("remaining_10")) return "remaining_10"
  if (ids.includes("sold_50")) return "sold_50"
  if (ids.includes("sold_10")) return "sold_10"
  return null
}

export function mergePushMilestones(
  alreadySent: readonly PushMilestoneId[],
  extra: readonly PushMilestoneId[],
): PushMilestoneId[] {
  return [...new Set([...alreadySent, ...extra])]
}
