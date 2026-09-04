import { pushBroadcasts } from "@raffle/shared/db"
import type { PushBroadcastKind } from "@raffle/shared/push"
import { asc, desc, eq, gte } from "drizzle-orm"
import { getDb } from "@/lib/db.server"

export type PushBroadcastInsert = {
  kind: PushBroadcastKind
  raffleId?: number | null
  milestoneId?: string | null
  promotionId?: number | null
  title: string
  body: string
  url?: string
  tag: string
  sent: number
  removed: number
  total: number
}

export type PushBroadcastRow = {
  kind: string
  raffleId: number | null
  milestoneId: string | null
  promotionId: number | null
  title: string
  body: string
  url: string
  sent: number
  createdAt: Date
}

export async function insertPushBroadcast(input: PushBroadcastInsert): Promise<{ id: number }> {
  const [row] = await getDb()
    .insert(pushBroadcasts)
    .values({
      kind: input.kind,
      raffleId: input.raffleId ?? null,
      milestoneId: input.milestoneId ?? null,
      promotionId: input.promotionId ?? null,
      title: input.title,
      body: input.body,
      url: input.url?.trim() || "/",
      tag: input.tag,
      sent: input.sent,
      removed: input.removed,
      total: input.total,
    })
    .returning({ id: pushBroadcasts.id })
  if (!row) throw new Error("No se pudo guardar el aviso")
  return { id: row.id }
}

export async function updatePushBroadcastDelivery(
  id: number,
  input: { sent: number; removed: number; total: number },
): Promise<void> {
  await getDb()
    .update(pushBroadcasts)
    .set({
      sent: input.sent,
      removed: input.removed,
      total: input.total,
    })
    .where(eq(pushBroadcasts.id, id))
}

export async function listPushBroadcastsByRaffle(raffleId: number): Promise<PushBroadcastRow[]> {
  return getDb()
    .select({
      kind: pushBroadcasts.kind,
      raffleId: pushBroadcasts.raffleId,
      milestoneId: pushBroadcasts.milestoneId,
      promotionId: pushBroadcasts.promotionId,
      title: pushBroadcasts.title,
      body: pushBroadcasts.body,
      url: pushBroadcasts.url,
      sent: pushBroadcasts.sent,
      createdAt: pushBroadcasts.createdAt,
    })
    .from(pushBroadcasts)
    .where(eq(pushBroadcasts.raffleId, raffleId))
    .orderBy(asc(pushBroadcasts.createdAt))
}

export async function findPushBroadcastByPromotionId(
  promotionId: number,
): Promise<{ id: number } | undefined> {
  const [row] = await getDb()
    .select({ id: pushBroadcasts.id })
    .from(pushBroadcasts)
    .where(eq(pushBroadcasts.promotionId, promotionId))
    .limit(1)
  return row
}

export type PushInboxBroadcastRow = {
  id: number
  kind: string
  raffleId: number | null
  milestoneId: string | null
  title: string
  body: string
  url: string
  tag: string
  createdAt: Date
}

export async function listPushBroadcastsSince(since: Date): Promise<PushInboxBroadcastRow[]> {
  return getDb()
    .select({
      id: pushBroadcasts.id,
      kind: pushBroadcasts.kind,
      raffleId: pushBroadcasts.raffleId,
      milestoneId: pushBroadcasts.milestoneId,
      title: pushBroadcasts.title,
      body: pushBroadcasts.body,
      url: pushBroadcasts.url,
      tag: pushBroadcasts.tag,
      createdAt: pushBroadcasts.createdAt,
    })
    .from(pushBroadcasts)
    .where(gte(pushBroadcasts.createdAt, since))
    .orderBy(desc(pushBroadcasts.createdAt))
}
