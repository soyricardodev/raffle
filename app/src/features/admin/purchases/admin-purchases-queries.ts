import { PaymentMethod } from "@raffle/shared/payment-methods"
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireAdminMiddleware } from "@/features/admin/shared/admin-auth-middleware"
import { decodeAdminPurchaseCursor } from "@/server/admin-purchases-cursor"
import { listAdminPurchases } from "@/server/purchase.service"
import { getDashboardStats } from "@/server/raffle.service"

export const ADMIN_PURCHASES_PAGE_SIZE = 50

const PurchaseStatusFilter = z.enum(["all", "pending", "approved", "rejected"]).catch("all")
const PaymentMethodFilter = z.union([z.literal("all"), PaymentMethod]).catch("all")

const AdminPurchasesListFiltersInput = z.object({
  limit: z.number().int().min(1).max(100).catch(ADMIN_PURCHASES_PAGE_SIZE),
  status: PurchaseStatusFilter,
  paymentMethod: PaymentMethodFilter,
  raffleId: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
  searchType: z.enum(["all", "name", "phone", "email", "ci"]).catch("all"),
  start: z.string().nullable().optional(),
  end: z.string().nullable().optional(),
})

const AdminPurchasesFetchInput = AdminPurchasesListFiltersInput.extend({
  cursor: z.string().nullable().optional(),
})

export type AdminPurchaseListFilters = z.infer<typeof AdminPurchasesListFiltersInput>
export type AdminDashboardStats = Awaited<ReturnType<typeof getDashboardStats>>
export type AdminPurchasesResult = Awaited<ReturnType<typeof listAdminPurchases>>
export type AdminPurchasesInfinitePage = AdminPurchasesResult

export type AdminPurchaseSearchParams = {
  status?: string
  payment_method?: string
  raffle_id?: string
  q?: string
  start?: string
  end?: string
  limit?: number
  purchase?: number
}

export const adminPurchasesQueryKeys = {
  dashboard: ["admin", "dashboard", "purchases"] as const,
  list: (filters: AdminPurchaseListFilters) => ["admin", "purchases", filters] as const,
}

export function getDefaultAdminPurchasesRaffleId(dashboard?: AdminDashboardStats | null) {
  const activeRaffle = dashboard?.filter_raffles.find((raffle) => raffle.status === "active")
  return activeRaffle ? String(activeRaffle.id) : null
}

export function flattenAdminPurchasesPages(
  pages: Array<AdminPurchasesInfinitePage> | undefined,
): AdminPurchasesInfinitePage["data"] {
  return pages?.flatMap((page) => page.data) ?? []
}

export const fetchAdminPurchasesDashboard = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    return getDashboardStats()
  })

export const fetchAdminPurchases = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .inputValidator(AdminPurchasesFetchInput)
  .handler(async ({ data }) => {
    return listAdminPurchases({
      limit: data.limit,
      cursor: decodeAdminPurchaseCursor(data.cursor),
      status: data.status,
      paymentMethod: data.paymentMethod,
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
): AdminPurchaseListFilters {
  const raffleId =
    search.raffle_id === "all"
      ? null
      : search.raffle_id || options?.defaultRaffleId || null

  return AdminPurchasesListFiltersInput.parse({
    limit: search.limit ?? ADMIN_PURCHASES_PAGE_SIZE,
    status: search.status ?? "all",
    paymentMethod: search.payment_method ?? "all",
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

export function adminPurchasesInfiniteQueryOptions(filters: AdminPurchaseListFilters) {
  return infiniteQueryOptions({
    queryKey: adminPurchasesQueryKeys.list(filters),
    queryFn: ({ pageParam }) =>
      fetchAdminPurchases({
        data: {
          ...filters,
          cursor: pageParam,
        },
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 10_000,
  })
}

/** Poll only while the user has not scrolled past the first page. */
export function adminPurchasesRefetchInterval(query: {
  state: { data?: { pages: unknown[] } }
}): number | false {
  const pageCount = query.state.data?.pages.length ?? 0
  return pageCount <= 1 ? 30_000 : false
}
