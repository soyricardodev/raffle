import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireAdminMiddleware } from "@/features/admin/shared/admin-auth-middleware"
import { listAdminPurchases } from "@/server/purchase.service"
import { getDashboardStats } from "@/server/raffle.service"

export const ADMIN_PURCHASES_PAGE_SIZE = 50

const PurchaseStatusFilter = z.enum(["all", "pending", "approved", "rejected"]).catch("all")

const AdminPurchasesInput = z.object({
  limit: z.number().int().min(1).max(100).catch(ADMIN_PURCHASES_PAGE_SIZE),
  page: z.number().int().min(1).catch(1),
  status: PurchaseStatusFilter,
  raffleId: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
  searchType: z.enum(["all", "name", "phone", "email", "ci"]).catch("all"),
  start: z.string().nullable().optional(),
  end: z.string().nullable().optional(),
})

export type AdminPurchaseFilters = z.infer<typeof AdminPurchasesInput>
export type AdminDashboardStats = Awaited<ReturnType<typeof getDashboardStats>>
export type AdminPurchasesResult = Awaited<ReturnType<typeof listAdminPurchases>>

export type AdminPurchaseSearchParams = {
  status?: string
  raffle_id?: string
  q?: string
  start?: string
  end?: string
  page?: number
  limit?: number
  purchase?: number
}

export const adminPurchasesQueryKeys = {
  dashboard: ["admin", "dashboard", "purchases"] as const,
  list: (filters: AdminPurchaseFilters) => ["admin", "purchases", filters] as const,
}

export function getDefaultAdminPurchasesRaffleId(dashboard?: AdminDashboardStats | null) {
  const activeRaffle = dashboard?.filter_raffles.find((raffle) => raffle.status === "active")
  return activeRaffle ? String(activeRaffle.id) : null
}

export const fetchAdminPurchasesDashboard = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    return getDashboardStats()
  })

export const fetchAdminPurchases = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .inputValidator(AdminPurchasesInput)
  .handler(async ({ data }) => {
    return listAdminPurchases({
      limit: data.limit,
      page: data.page,
      status: data.status,
      raffleId: data.raffleId,
      search: data.search,
      searchType: data.searchType,
      start: data.start,
      end: data.end,
    })
  })

export function normalizeAdminPurchaseFilters(
  search: AdminPurchaseSearchParams,
  options?: { defaultRaffleId?: string | null },
): AdminPurchaseFilters {
  const raffleId =
    search.raffle_id === "all"
      ? null
      : search.raffle_id || options?.defaultRaffleId || null

  return AdminPurchasesInput.parse({
    limit: search.limit ?? ADMIN_PURCHASES_PAGE_SIZE,
    page: search.page ?? 1,
    status: search.status ?? "all",
    raffleId,
    search: search.q?.trim() || null,
    searchType: "all",
    start: search.start || null,
    end: search.end || null,
  })
}

export function adminPurchasesDashboardQueryOptions() {
  return queryOptions({
    queryKey: adminPurchasesQueryKeys.dashboard,
    queryFn: () => fetchAdminPurchasesDashboard(),
    staleTime: 30_000,
  })
}

export function adminPurchasesQueryOptions(filters: AdminPurchaseFilters) {
  return queryOptions({
    queryKey: adminPurchasesQueryKeys.list(filters),
    queryFn: () => fetchAdminPurchases({ data: filters }),
    staleTime: 10_000,
  })
}
