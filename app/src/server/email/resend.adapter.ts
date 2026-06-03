import { EmailSendError } from "@raffle/shared/errors"
import { Resend } from "resend"
import { getEnv } from "@/lib/env"
import { getLogger } from "@/lib/logger"
import { formatEmailFrom, resolveEmailSenderConfig } from "./email-from"
import type { EmailAdapter, SendEmailParams, SendEmailResult } from "./types"

const logger = getLogger()

export class ResendEmailAdapter implements EmailAdapter {
  readonly provider = "resend"
  private client: Resend

  constructor() {
    const apiKey = getEnv().RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend")
    }
    this.client = new Resend(apiKey)
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const sender = await resolveEmailSenderConfig()
    try {
      const result = await this.client.emails.send({
        from: formatEmailFrom(sender.fromName, sender.fromEmail),
        to: params.to,
        subject: params.subject,
        html: params.html,
        replyTo: sender.replyTo,
      })

      if (result.error) {
        logger.error({ error: result.error, to: params.to }, "email:resend:error")
        throw new EmailSendError(params.to, result.error.message ?? "Unknown Resend error")
      }

      logger.info(
        { to: params.to, subject: params.subject, id: result.data?.id },
        "email:resend:sent",
      )

      return {
        success: true,
        providerMessageId: result.data?.id,
      }
    } catch (error) {
      if (error instanceof EmailSendError) throw error
      throw new EmailSendError(params.to, String(error))
    }
  }
}
