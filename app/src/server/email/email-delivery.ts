import type { EmailType } from "@raffle/shared/validators"
import { getLogger } from "@/lib/logger"
import { sendEmail } from "./email.service"
import type { BuiltEmail } from "./email-types"
import * as emailLogsRepo from "../repositories/email-logs.repository"

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
}

export async function deliverAndLogEmail(input: DeliverEmailInput): Promise<DeliverEmailResult> {
  const { to, built, purchaseId, idempotencyKey } = input

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
    const message = error instanceof Error ? error.message : "Error al enviar correo"
    logger.error({ to, type: built.type, err: error }, "email:delivery_failed")
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
