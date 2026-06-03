import type { EmailLogRow } from "@/features/admin/emails/types"

export function canResendEmailLog(
  log: Pick<EmailLogRow, "purchase_id" | "status" | "email_type">,
): boolean {
  if (log.purchase_id == null) return false
  if (log.email_type === "test") return false
  return log.status === "failed" || log.status === "error"
}
