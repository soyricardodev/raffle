import { raffleBuyerPresence } from "@raffle/shared/db"
import { and, eq, gte, lt, sql } from "drizzle-orm"
import { getDb } from "@/lib/db.server"

export const BUYER_PRESENCE_TTL_MS = 45_000

export async function upsertBuyerPresence(raffleId: number, clientId: string): Promise<void> {
  const db = getDb()
  const now = new Date()
  await db
    .insert(raffleBuyerPresence)
    .values({
      raffleId,
      clientId,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [raffleBuyerPresence.raffleId, raffleBuyerPresence.clientId],
      set: { lastSeenAt: now },
    })
}

export async function countActiveBuyers(
  raffleId: number,
  ttlMs: number = BUYER_PRESENCE_TTL_MS,
): Promise<number> {
  const db = getDb()
  const cutoff = new Date(Date.now() - ttlMs)
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(raffleBuyerPresence)
    .where(
      and(eq(raffleBuyerPresence.raffleId, raffleId), gte(raffleBuyerPresence.lastSeenAt, cutoff)),
    )
  return Number(row?.count ?? 0)
}

/** Removes stale presence rows for one raffle (heartbeat write path only). */
export async function pruneExpiredBuyerPresenceForRaffle(
  raffleId: number,
  ttlMs: number = BUYER_PRESENCE_TTL_MS,
): Promise<void> {
  const db = getDb()
  const cutoff = new Date(Date.now() - ttlMs)
  await db
    .delete(raffleBuyerPresence)
    .where(
      and(eq(raffleBuyerPresence.raffleId, raffleId), lt(raffleBuyerPresence.lastSeenAt, cutoff)),
    )
}
