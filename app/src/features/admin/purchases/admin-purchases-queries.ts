import { raffles } from "@raffle/shared/db"
import { PaymentMethod } from "@raffle/shared/payment-methods"
import { normalizePurchaseRejectReasons } from "@raffle/shared/site-config"
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { desc } from "drizzle-orm"
import { z } from "zod"
import { adminPermissionMiddleware } from "@/features/admin/shared/admin-auth-middleware"
import {
  getDefaultAdminRaffleId,
  resolveAdminRaffleScopeFromSearch,
} from "@/features/admin/shared/admin-raffle-scope"
import { getDb } from "@/lib/db.server"
import { requirePurchasesModuleAccess } from "@/lib/purchases-access.server"
import { decodeAdminPurchaseCursor } from "@/server/admin-purchases-cursor"
import { listAdminPurchases } from "@/server/purchase.service"
import { getSiteConfigMap } from "@/server/site-config.service"

export const ADMIN_PURCHASES_PAGE_SIZE = 50

const PurchaseStatusFilter = z.enum(["all", "pending", "approved", "rejected"]).catch("all")
const PaymentMethodFilter = z.union([z.literal("all"), PaymentMethod]).catch("all")

const AdminPurchaseSortFilter = z.enum(["newest", "oldest"]).catch("newest")

const AdminPurchasesListFiltersInput = z.object({
  limit: z.number().int().min(1).max(100).catch(ADMIN_PURCHASES_PAGE_SIZE),
  status: PurchaseStatusFilter,
  paymentMethod: PaymentMethodFilter,
  raffleId: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
  searchType: z.enum(["all", "name", "phone", "email", "ci", "ticket"]).catch("all"),
  start: z.string().nullable().optional(),
  end: z.string().nullable().optional(),
  sort: AdminPurchaseSortFilter,
})

const AdminPurchasesFetchInput = AdminPurchasesListFiltersInput.extend({
  cursor: z.string().nullable().optional(),
})

export type AdminPurchaseListFilters = z.infer<typeof AdminPurchasesListFiltersInput>

export function parseAdminPurchasesListFilters(value: unknown): AdminPurchaseListFilters | null {
  const parsed = AdminPurchasesListFiltersInput.safeParse(value)
  return parsed.success ? parsed.data : null
}
export type AdminPurchaseRaffleScope = {
  filter_raffles: Array<{ id: number; name: string; status: string }>
}
export type AdminPurchasesResult = Awaited<ReturnType<typeof listAdminPurchases>>
export type AdminPurchasesInfinitePage = AdminPurchasesResult

export type AdminPurchaseSearchParams = {
  status?: string
  payment_method?: string
  raffle_id?: string
  q?: string
  start?: string
  end?: string
  sort?: string
  limit?: number
  purchase?: number
}

export const adminPurchasesQueryKeys = {
  raffleScope: ["admin", "purchases", "raffle-scope"] as const,
  list: (filters: AdminPurchaseListFilters) => ["admin", "purchases", filters] as const,
}

export function getDefaultAdminPurchasesRaffleId(scope?: AdminPurchaseRaffleScope | null) {
  return getDefaultAdminRaffleId(scope)
}

export function flattenAdminPurchasesPages(
  pages: Array<AdminPurchasesInfinitePage> | undefined,
): AdminPurchasesInfinitePage["data"] {
  return pages?.flatMap((page) => page.data) ?? []
}

export const fetchAdminPurchasesRaffleScope = createServerFn({ method: "GET" })
  .middleware([adminPermissionMiddleware("purchases.read")])
  .handler(async () => {
    return {
      filter_raffles: await getDb()
        .select({ id: raffles.id, name: raffles.name, status: raffles.status })
        .from(raffles)
        .orderBy(desc(raffles.createdAt)),
    }
  })

/** Purchase-only config needed by the rejection dialog, without exposing all settings. */
export const fetchPurchaseRejectReasons = createServerFn({ method: "GET" })
  .middleware([adminPermissionMiddleware("purchases.reject")])
  .handler(async () => {
    const config = await getSiteConfigMap()
    return normalizePurchaseRejectReasons(config.purchase_reject_reasons)
  })

export const fetchAdminPurchases = createServerFn({ method: "POST" })
  .middleware([adminPermissionMiddleware("purchases.read")])
  .inputValidator(AdminPurchasesFetchInput)
  .handler(async ({ data }) => {
    await requirePurchasesModuleAccess(getRequest())
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
      sort: data.sort,
    })
  })

export function normalizeAdminPurchaseFilters(
  search: AdminPurchaseSearchParams,
  options?: { defaultRaffleId?: string | null },
): AdminPurchaseListFilters {
  const raffleId = resolveAdminRaffleScopeFromSearch(search.raffle_id, options?.defaultRaffleId)

  return AdminPurchasesListFiltersInput.parse({
    limit: search.limit ?? ADMIN_PURCHASES_PAGE_SIZE,
    status: search.status ?? "all",
    paymentMethod: search.payment_method ?? "all",
    raffleId,
    search: search.q?.trim() || null,
    searchType: "all",
    start: search.start || null,
    end: search.end || null,
    sort: search.sort ?? "newest",
  })
}

export function adminPurchasesRaffleScopeQueryOptions() {
  return queryOptions({
    queryKey: adminPurchasesQueryKeys.raffleScope,
    queryFn: () => fetchAdminPurchasesRaffleScope(),
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
