import { getLogger } from "@/lib/logger"
import type { EmailAdapter, SendEmailParams, SendEmailResult } from "./types"

const logger = getLogger()

export class NoopEmailAdapter implements EmailAdapter {
  readonly provider = "noop"

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    logger.info(
      { to: params.to, subject: params.subject, type: params.type },
      "email:noop — email would be sent here",
    )
    return { success: true, providerMessageId: `noop-${Date.now()}` }
  }
}
