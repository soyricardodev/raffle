import { auditEvents } from "@raffle/shared/db"
import type { DbTransaction } from "@/lib/db.server"

export async function recordAdminEvent(
  tx: DbTransaction,
  input: {
    actorUserId: string | number
    action: string
    raffleId?: number
    purchaseId?: number
    payload?: Record<string, string | number | boolean | null>
  },
) {
  await tx.insert(auditEvents).values({
    actorUserId: String(input.actorUserId),
    action: input.action,
    raffleId: input.raffleId,
    purchaseId: input.purchaseId,
    payload: input.payload ? JSON.stringify(input.payload) : null,
  })
}
