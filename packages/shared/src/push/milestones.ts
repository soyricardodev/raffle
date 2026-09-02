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
] as const satisfies ReadonlyArray<{ id: Exclude<PushMilestoneId, "new_raffle">; minPercent: number }>

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
