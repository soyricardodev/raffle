import { getLogger } from "@/lib/logger"

const logger = getLogger()

export type PurchaseAuditAction =
  | "tickets_added"
  | "tickets_removed"
  | "status_changed"
  | "tickets_reassigned"
  | "customer_contact_updated"

export function logPurchaseAudit(
  action: PurchaseAuditAction,
  fields: {
    purchaseId: number
    raffleId?: number
    adminUserId?: string | number
    quantity?: number
    ticketNumbers?: string[]
    status?: string
    /** Which identity fields changed (no raw PII in logs). */
    fieldsChanged?: Array<"name" | "phone" | "email" | "ci" | "location">
  },
): void {
  logger.info(
    {
      audit: "purchase",
      action,
      purchaseId: fields.purchaseId,
      raffleId: fields.raffleId,
      adminUserId: fields.adminUserId,
      quantity: fields.quantity,
      ticketCount: fields.ticketNumbers?.length,
      status: fields.status,
      fieldsChanged: fields.fieldsChanged,
    },
    `audit:purchase:${action}`,
  )
}
