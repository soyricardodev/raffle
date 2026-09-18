import type { EmailType } from "@raffle/shared/validators"
import { getLogger } from "@/lib/logger"
import * as emailLogsRepo from "../repositories/email-logs.repository"
import { sendEmail } from "./email.service"
import type { BuiltEmail } from "./email-types"
import { getRecipientSafetyService, type RecipientSafetyDecision } from "./recipient-safety"

const logger = getLogger()

export type DeliverEmailInput = {
  to: string
  built: BuiltEmail
  purchaseId?: number | null
  idempotencyKey?: string | null
}

export type DeliverEmailResult = {
  success: boolean
  logId?: number
  error?: string
  providerMessageId?: string
  blocked?: boolean
}

function safetyMessage(decision: RecipientSafetyDecision): string {
  if (decision.state === "suppressed") {
    return `Recipient suppressed: ${decision.reason ?? "previous hard bounce or complaint"}`
  }
  if (decision.state === "undeliverable") {
    return `Recipient blocked as undeliverable: ${decision.reason ?? "verification failed"}`
  }
  if (decision.state === "risky") {
    return `Recipient held because verification returned risky: ${decision.reason ?? "deliverability risk"}`
  }
  return `Recipient held because delivery could not be verified: ${decision.reason ?? "unknown"}`
}

function sanitizeDeliveryError(error: unknown, recipient: string): string {
  const message = error instanceof Error ? error.message : "Email delivery failed"
  return message.replaceAll(recipient, "[recipient]")
}

export async function deliverAndLogEmail(input: DeliverEmailInput): Promise<DeliverEmailResult> {
  const { built, purchaseId, idempotencyKey } = input

  let safety: RecipientSafetyDecision
  try {
    safety = await getRecipientSafetyService().evaluate(input.to)
  } catch (error) {
    logger.error({ type: built.type, error: String(error) }, "email:recipient_safety_failed")
    const message = "Recipient held because the safety check failed"
    const logId = await emailLogsRepo.insertEmailLog({
      purchaseId: purchaseId ?? null,
      recipientEmail: input.to,
      emailType: built.type,
      subject: built.subject,
      status: "failed",
      errorMessage: message,
      metadata: built.metadata ?? null,
      idempotencyKey: idempotencyKey ?? null,
    })
    return { success: false, logId, error: message, blocked: true }
  }

  const to = safety.email
  if (!safety.allowed) {
    const message = safetyMessage(safety)
    const logId = await emailLogsRepo.insertEmailLog({
      purchaseId: purchaseId ?? null,
      recipientEmail: to,
      emailType: built.type,
      subject: built.subject,
      status: "blocked",
      errorMessage: message,
      metadata: {
        ...(built.metadata ?? {}),
        recipient_safety: {
          state: safety.state,
          reason: safety.reason,
          source: safety.source,
        },
      },
      idempotencyKey: idempotencyKey ?? null,
    })
    logger.warn(
      { type: built.type, state: safety.state, reason: safety.reason, source: safety.source },
      "email:recipient_blocked",
    )
    return { success: false, logId, error: message, blocked: true }
  }

  let result: Awaited<ReturnType<typeof sendEmail>>
  try {
    result = await sendEmail({
      to,
      type: built.type,
      subject: built.subject,
      html: built.html,
      metadata: built.metadata,
    })
  } catch (error) {
    const message = sanitizeDeliveryError(error, to)
    logger.error({ type: built.type, error: message }, "email:delivery_failed")
    const logId = await emailLogsRepo.insertEmailLog({
      purchaseId: purchaseId ?? null,
      recipientEmail: to,
      emailType: built.type,
      subject: built.subject,
      status: "failed",
      errorMessage: message,
      metadata: built.metadata ?? null,
      idempotencyKey: idempotencyKey ?? null,
    })
    return { success: false, logId, error: message }
  }

  const logId = await emailLogsRepo.insertEmailLog({
    purchaseId: purchaseId ?? null,
    recipientEmail: to,
    emailType: built.type,
    subject: built.subject,
    status: result.success ? "sent" : "failed",
    resendEmailId: result.providerMessageId ?? null,
    errorMessage: result.success ? null : (result.error ?? "Envío fallido"),
    metadata: built.metadata ?? null,
    idempotencyKey: idempotencyKey ?? null,
  })

  return {
    success: result.success,
    logId,
    error: result.error,
    providerMessageId: result.providerMessageId,
  }
}

export function resendIdempotencyKey(logId: number): string {
  return `resend:${logId}:${Date.now()}`
}

export const RESENDABLE_EMAIL_TYPES: ReadonlySet<EmailType> = new Set([
  "purchase_confirmation",
  "status_update",
  "ticket_modification",
  "purchase_reassign",
])
