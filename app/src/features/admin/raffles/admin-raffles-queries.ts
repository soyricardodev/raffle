import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireAdminMiddleware } from "@/features/admin/shared/admin-auth-middleware"
import { listAdminRaffles } from "@/server/raffle.service"

export const ADMIN_RAFFLES_PAGE_SIZE = 50

const RaffleStatusFilter = z
  .enum(["all", "draft", "active", "paused", "finished", "cancelled"])
  .catch("active")

const AdminRafflesInput = z.object({
  limit: z.number().int().min(1).max(100).catch(ADMIN_RAFFLES_PAGE_SIZE),
  page: z.number().int().min(1).catch(1),
  status: RaffleStatusFilter,
  search: z.string().nullable().optional(),
})

export type AdminRaffleFilters = z.infer<typeof AdminRafflesInput>

export type AdminRafflesSearchParams = {
  status?: string
  q?: string
  page?: number
  limit?: number
}

export const adminRafflesQueryKeys = {
  list: (filters: AdminRaffleFilters) =>
    ["admin", "raffles", "list", filters] as const,
}

export const fetchAdminRaffles = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .inputValidator(AdminRafflesInput)
  .handler(async ({ data }) => {
    return listAdminRaffles({
      limit: data.limit,
      page: data.page,
      status: data.status,
      search: data.search,
    })
  })

export function normalizeAdminRaffleFilters(
  search: AdminRafflesSearchParams
): AdminRaffleFilters {
  return AdminRafflesInput.parse({
    limit: search.limit ?? ADMIN_RAFFLES_PAGE_SIZE,
    page: search.page ?? 1,
    status: search.status ?? "active",
    search: search.q?.trim() || null,
  })
}

export function adminRafflesQueryOptions(filters: AdminRaffleFilters) {
  return queryOptions({
    queryKey: adminRafflesQueryKeys.list(filters),
    queryFn: () => fetchAdminRaffles({ data: filters }),
    staleTime: 15_000,
  })
}
