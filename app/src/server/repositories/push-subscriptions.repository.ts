import { pushSubscriptions } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { type DbTransaction, getDb } from "@/lib/db.server"

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect

export async function upsertPushSubscription(
  input: {
    endpoint: string
    p256dh: string
    auth: string
    userAgent: string | null
  },
  now = new Date(),
): Promise<void> {
  const db = getDb()
  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, input.endpoint))
    .limit(1)

  if (existing[0]) {
    await db
      .update(pushSubscriptions)
      .set({
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
        lastSeenAt: now,
      })
      .where(eq(pushSubscriptions.id, existing[0].id))
    return
  }

  await db.insert(pushSubscriptions).values({
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    userAgent: input.userAgent,
    createdAt: now,
    lastSeenAt: now,
  })
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await getDb().delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
}

export async function deletePushSubscriptionById(
  tx: DbTransaction | ReturnType<typeof getDb>,
  id: number,
): Promise<void> {
  await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id))
}

export async function listPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  return getDb().select().from(pushSubscriptions)
}
