import { purchaseSuccessAnalyticsEvents } from "@raffle/shared/db"
import { getDb } from "@/lib/db.server"

export async function insertPurchaseSuccessAnalyticsEvent(input: {
  eventName: string
  properties?: Record<string, string | number | boolean>
  sessionId?: string
}) {
  const db = getDb()
  await db.insert(purchaseSuccessAnalyticsEvents).values({
    eventName: input.eventName,
    properties: input.properties ? JSON.stringify(input.properties) : null,
    sessionId: input.sessionId ?? null,
  })
}
