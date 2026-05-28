export type EmailLogRow = {
  id: number
  purchase_id: number | null
  recipient_email: string
  email_type: string
  subject: string
  status: string
  sent_at: string | Date | null
  created_at: string | Date
  customer_name: string | null
}
