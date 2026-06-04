import type { PurchaseAdminAudit } from "@/server/purchase-admin.types"
import { requireAdminMutation } from "./auth-utils.server"
import { parsePositiveRouteId } from "./parse-positive-route-id"

export async function adminPurchaseRouteContext(
  request: Request,
  purchaseIdRaw: string,
): Promise<{ purchaseId: number; audit: PurchaseAdminAudit }> {
  const admin = await requireAdminMutation(request)
  const purchaseId = parsePositiveRouteId(purchaseIdRaw, "ID de compra")
  return { purchaseId, audit: { adminUserId: admin.id } }
}
