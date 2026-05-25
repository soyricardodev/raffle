import { getEnv } from "@/lib/env"
import { getLogger } from "@/lib/logger"
import type { EmailAdapter } from "./types"
import { NoopEmailAdapter } from "./noop.adapter"
import { ResendEmailAdapter } from "./resend.adapter"
import { BrevoEmailAdapter } from "./brevo.adapter"

const logger = getLogger()

let _adapter: EmailAdapter | undefined

export function getEmailAdapter(): EmailAdapter {
  if (!_adapter) {
    const provider = getEnv().EMAIL_PROVIDER

    switch (provider) {
      case "resend":
        _adapter = new ResendEmailAdapter()
        break
      case "brevo":
        _adapter = new BrevoEmailAdapter()
        break
      case "noop":
      default:
        _adapter = new NoopEmailAdapter()
        break
    }

    logger.info({ provider: _adapter.provider }, "email:adapter:initialized")
  }

  return _adapter
}

export async function sendEmail(
  params: import("./types").SendEmailParams,
): Promise<import("./types").SendEmailResult> {
  return getEmailAdapter().send(params)
}
