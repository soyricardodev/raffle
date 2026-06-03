import type { EmailType } from "@raffle/shared/validators"

export type EmailLogStatus = "pending" | "sent" | "failed" | "error"

export type EmailLogRow = {
  id: number
  purchase_id: number | null
  recipient_email: string
  email_type: EmailType | string
  subject: string
  status: EmailLogStatus | string
  error_message: string | null
  resend_email_id: string | null
  idempotency_key: string | null
  sent_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
  customer_name: string | null
  customer_phone: string | null
}

export type EmailLogDetail = EmailLogRow & {
  metadata: Record<string, unknown> | null
}

export type EmailLogStats = {
  total: number
  sent: number
  failed: number
  pending: number
  error: number
  success_rate: number
  failed_last_24h: number
}

export type EmailProviderHealth = {
  provider: string
  adapter: string
  is_noop: boolean
  delivers_real_email: boolean
  from_email: string | null
  from_name: string | null
}
