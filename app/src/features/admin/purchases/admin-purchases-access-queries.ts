import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireAdminMiddleware } from "@/features/admin/shared/admin-auth-middleware"
import {
  getPurchasesAccessStatus,
  purchasesAccessRequest,
  unlockPurchasesAccess,
  updatePurchasesAccessKey,
} from "@/lib/purchases-access.server"
import type { PurchasesAccessStatus } from "@/server/purchases-access"

export type { PurchasesAccessStatus }

export const adminPurchasesAccessQueryKey = ["admin", "purchases-access"] as const

export const fetchPurchasesAccessStatus = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    return getPurchasesAccessStatus(purchasesAccessRequest())
  })

export const unlockPurchasesAccessFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .inputValidator(z.object({ key: z.string().max(80) }))
  .handler(async ({ data }) => {
    return unlockPurchasesAccess(purchasesAccessRequest(), data.key)
  })

export const updatePurchasesAccessKeyFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      key: z.union([z.string().max(80), z.null()]),
    }),
  )
  .handler(async ({ data }) => {
    return updatePurchasesAccessKey(purchasesAccessRequest(), data.key)
  })

export function adminPurchasesAccessQueryOptions() {
  return queryOptions({
    queryKey: adminPurchasesAccessQueryKey,
    queryFn: () => fetchPurchasesAccessStatus(),
    staleTime: 30_000,
  })
}
