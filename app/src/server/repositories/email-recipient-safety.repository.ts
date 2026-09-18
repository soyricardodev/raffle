import { emailRecipientVerifications, emailSuppressions } from "@raffle/shared/db"
import { and, eq, gt } from "drizzle-orm"
import { getDb } from "@/lib/db.server"

export type RecipientVerificationState = "deliverable" | "risky" | "undeliverable" | "unknown"

export type RecipientVerification = {
  email: string
  provider: string
  state: RecipientVerificationState
  reason: string | null
  score: number | null
  checkedAt: Date
  expiresAt: Date
}

export type RecipientSuppression = {
  email: string
  source: string
  reason: string
  providerMessageId: string | null
  createdAt: Date
}

export async function getSuppression(email: string): Promise<RecipientSuppression | null> {
  const [row] = await getDb()
    .select({
      email: emailSuppressions.email,
      source: emailSuppressions.source,
      reason: emailSuppressions.reason,
      providerMessageId: emailSuppressions.providerMessageId,
      createdAt: emailSuppressions.createdAt,
    })
    .from(emailSuppressions)
    .where(eq(emailSuppressions.email, email))
    .limit(1)
  return row ?? null
}

export async function getFreshVerification(
  email: string,
  now: Date,
): Promise<RecipientVerification | null> {
  const [row] = await getDb()
    .select()
    .from(emailRecipientVerifications)
    .where(
      and(
        eq(emailRecipientVerifications.email, email),
        gt(emailRecipientVerifications.expiresAt, now),
      ),
    )
    .limit(1)

  if (!row) return null
  return { ...row, state: row.state as RecipientVerificationState }
}

export async function upsertVerification(input: RecipientVerification): Promise<void> {
  const now = new Date()
  await getDb()
    .insert(emailRecipientVerifications)
    .values({
      email: input.email,
      provider: input.provider,
      state: input.state,
      reason: input.reason,
      score: input.score,
      checkedAt: input.checkedAt,
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: emailRecipientVerifications.email,
      set: {
        provider: input.provider,
        state: input.state,
        reason: input.reason,
        score: input.score,
        checkedAt: input.checkedAt,
        expiresAt: input.expiresAt,
        updatedAt: now,
      },
    })
}

export async function suppressRecipient(input: {
  email: string
  source: string
  reason: string
  providerMessageId?: string | null
}): Promise<void> {
  const now = new Date()
  await getDb()
    .insert(emailSuppressions)
    .values({
      email: input.email,
      source: input.source,
      reason: input.reason,
      providerMessageId: input.providerMessageId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: emailSuppressions.email,
      set: {
        source: input.source,
        reason: input.reason,
        providerMessageId: input.providerMessageId ?? null,
        updatedAt: now,
      },
    })
}
