import type { EmailType } from "@raffle/shared/validators"

export type SendEmailParams = {
  to: string
  subject: string
  html: string
  type: EmailType
  metadata?: Record<string, unknown>
}

export type SendEmailResult = {
  success: boolean
  providerMessageId?: string
  error?: string
}

export interface EmailAdapter {
  readonly provider: string
  send(params: SendEmailParams): Promise<SendEmailResult>
}
