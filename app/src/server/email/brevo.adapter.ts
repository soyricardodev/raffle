import { getEnv } from "@/lib/env"
import { getLogger } from "@/lib/logger"
import { EmailSendError } from "@raffle/shared/errors"
import type { EmailAdapter, SendEmailParams, SendEmailResult } from "./types"

const logger = getLogger()

export class BrevoEmailAdapter implements EmailAdapter {
  readonly provider = "brevo"

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const apiKey = getEnv().BREVO_API_KEY
    if (!apiKey) {
      throw new Error("BREVO_API_KEY is required when EMAIL_PROVIDER=brevo")
    }

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "Rifas", email: "noreply@rifas.com" },
          to: [{ email: params.to }],
          subject: params.subject,
          htmlContent: params.html,
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        logger.error(
          { status: response.status, body, to: params.to },
          "email:brevo:error",
        )
        throw new EmailSendError(params.to, `Brevo API error ${response.status}: ${body}`)
      }

      const data = (await response.json()) as { messageId?: string }
      logger.info(
        { to: params.to, subject: params.subject, messageId: data.messageId },
        "email:brevo:sent",
      )

      return {
        success: true,
        providerMessageId: data.messageId,
      }
    } catch (error) {
      if (error instanceof EmailSendError) throw error
      throw new EmailSendError(params.to, String(error))
    }
  }
}
