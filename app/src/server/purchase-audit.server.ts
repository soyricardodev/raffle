import { getLogger } from "@/lib/logger"

const logger = getLogger()

export type PurchaseAuditAction =
  | "tickets_added"
  | "tickets_removed"
  | "status_changed"
  | "tickets_reassigned"

export function logPurchaseAudit(
  action: PurchaseAuditAction,
  fields: {
    purchaseId: number
    raffleId?: number
    adminUserId?: string | number
    quantity?: number
    ticketNumbers?: string[]
    status?: string
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
    },
    `audit:purchase:${action}`,
  )
}
