import { pushInboxReads } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db.server"

export async function listReadBroadcastIds(subscriptionId: number): Promise<number[]> {
  const rows = await getDb()
    .select({ broadcastId: pushInboxReads.broadcastId })
    .from(pushInboxReads)
    .where(eq(pushInboxReads.subscriptionId, subscriptionId))
  return rows.map((row) => row.broadcastId)
}

export async function markBroadcastsRead(input: {
  subscriptionId: number
  broadcastIds: number[]
  now?: Date
}): Promise<void> {
  const uniqueIds = [...new Set(input.broadcastIds)].filter((id) => Number.isInteger(id) && id > 0)
  if (uniqueIds.length === 0) return

  const already = await listReadBroadcastIds(input.subscriptionId)
  const alreadySet = new Set(already)
  const toInsert = uniqueIds.filter((id) => !alreadySet.has(id))
  if (toInsert.length === 0) return

  const readAt = input.now ?? new Date()
  await getDb()
    .insert(pushInboxReads)
    .values(
      toInsert.map((broadcastId) => ({
        subscriptionId: input.subscriptionId,
        broadcastId,
        readAt,
      })),
    )
    .onConflictDoNothing()
}
