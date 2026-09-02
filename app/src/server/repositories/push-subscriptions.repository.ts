import { pushSubscriptions } from "@raffle/shared/db"
import { desc, eq } from "drizzle-orm"
import { type DbTransaction, getDb } from "@/lib/db.server"

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect

export type PushSubscriptionIdentityPatch = {
  displayName?: string
  customerPhoneNormalized?: string
  customerId?: number
}

export async function upsertPushSubscription(
  input: {
    endpoint: string
    p256dh: string
    auth: string
    userAgent: string | null
    identity?: PushSubscriptionIdentityPatch
  },
  now = new Date(),
): Promise<void> {
  const db = getDb()
  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, input.endpoint))
    .limit(1)

  const identityPatch = compactIdentityPatch(input.identity)

  if (existing[0]) {
    await db
      .update(pushSubscriptions)
      .set({
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
        lastSeenAt: now,
        ...identityPatch,
      })
      .where(eq(pushSubscriptions.id, existing[0].id))
    return
  }

  await db.insert(pushSubscriptions).values({
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    userAgent: input.userAgent,
    displayName: identityPatch.displayName ?? null,
    customerPhoneNormalized: identityPatch.customerPhoneNormalized ?? null,
    customerId: identityPatch.customerId ?? null,
    createdAt: now,
    lastSeenAt: now,
  })
}

function compactIdentityPatch(
  identity: PushSubscriptionIdentityPatch | undefined,
): PushSubscriptionIdentityPatch {
  if (!identity) return {}
  const patch: PushSubscriptionIdentityPatch = {}
  if (identity.displayName) patch.displayName = identity.displayName
  if (identity.customerPhoneNormalized) {
    patch.customerPhoneNormalized = identity.customerPhoneNormalized
  }
  if (identity.customerId) patch.customerId = identity.customerId
  return patch
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

export async function listPushSubscriptionSummaries(): Promise<
  Array<{
    id: number
    userAgent: string | null
    displayName: string | null
    createdAt: Date
    lastSeenAt: Date
  }>
> {
  return getDb()
    .select({
      id: pushSubscriptions.id,
      userAgent: pushSubscriptions.userAgent,
      displayName: pushSubscriptions.displayName,
      createdAt: pushSubscriptions.createdAt,
      lastSeenAt: pushSubscriptions.lastSeenAt,
    })
    .from(pushSubscriptions)
    .orderBy(desc(pushSubscriptions.lastSeenAt))
}

export async function findPushSubscriptionByEndpoint(
  endpoint: string,
): Promise<{ id: number; createdAt: Date } | undefined> {
  const [row] = await getDb()
    .select({
      id: pushSubscriptions.id,
      createdAt: pushSubscriptions.createdAt,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1)
  return row
}

export async function touchPushSubscriptionLastSeen(id: number, now = new Date()): Promise<void> {
  await getDb()
    .update(pushSubscriptions)
    .set({ lastSeenAt: now })
    .where(eq(pushSubscriptions.id, id))
}
