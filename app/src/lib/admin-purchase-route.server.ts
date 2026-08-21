import type { PurchaseAdminAudit } from "@/server/purchase-admin.types"
import { requireAdminMutation } from "./auth-utils.server"
import { parsePositiveRouteId } from "./parse-positive-route-id"
import { requirePurchasesModuleAccess } from "./purchases-access.server"

export async function adminPurchaseRouteContext(
  request: Request,
  purchaseIdRaw: string,
  options?: { requireModuleAccess?: boolean },
): Promise<{ purchaseId: number; audit: PurchaseAdminAudit }> {
  const admin = await requireAdminMutation(request)
  if (options?.requireModuleAccess) {
    await requirePurchasesModuleAccess(request)
  }
  const purchaseId = parsePositiveRouteId(purchaseIdRaw, "ID de compra")
  return { purchaseId, audit: { adminUserId: admin.id } }
}
