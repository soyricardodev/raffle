import {
  ADMIN_EMAILS_PAGE_SIZE,
  AdminEmailListInput,
  type AdminEmailListInput as AdminEmailFilters,
  type AdminEmailsRouteSearch,
  normalizeAdminEmailListFilters,
} from "@raffle/shared/admin/email-list-filters"
import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { requireAdminMiddleware } from "@/features/admin/shared/admin-auth-middleware"
import type { EmailLogDetail, EmailLogStats, EmailProviderHealth } from "@/features/admin/emails/types"
import {
  getEmailLogStats,
  listEmailLogs,
} from "@/server/email-admin.service"
import { adminFetch } from "@/lib/admin-fetch"

export { ADMIN_EMAILS_PAGE_SIZE }
export type AdminEmailsSearchParams = AdminEmailsRouteSearch
export type { AdminEmailFilters }

export const adminEmailsQueryKeys = {
  list: (filters: AdminEmailFilters) => ["admin", "emails", "list", filters] as const,
  stats: (filters: AdminEmailFilters) => ["admin", "emails", "stats", filters] as const,
  health: ["admin", "emails", "health"] as const,
  detail: (id: number) => ["admin", "emails", "detail", id] as const,
  purchase: (purchaseId: number) => ["admin", "emails", "purchase", purchaseId] as const,
}

function statsFilterSlice(filters: AdminEmailFilters) {
  return {
    search: filters.search,
    start: filters.start,
    end: filters.end,
    emailType: filters.emailType,
    purchaseId: filters.purchaseId,
  }
}

export const fetchAdminEmails = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .inputValidator(AdminEmailListInput)
  .handler(async ({ data }) => listEmailLogs(data))

export const fetchAdminEmailStats = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .inputValidator(AdminEmailListInput)
  .handler(async ({ data }) => getEmailLogStats(statsFilterSlice(data)))

export function normalizeAdminEmailFilters(search: AdminEmailsSearchParams): AdminEmailFilters {
  return normalizeAdminEmailListFilters(search)
}

export function adminEmailsQueryOptions(filters: AdminEmailFilters) {
  return queryOptions({
    queryKey: adminEmailsQueryKeys.list(filters),
    queryFn: () => fetchAdminEmails({ data: filters }),
    staleTime: 15_000,
  })
}

export function adminEmailStatsQueryOptions(filters: AdminEmailFilters) {
  return queryOptions({
    queryKey: adminEmailsQueryKeys.stats(filters),
    queryFn: () => fetchAdminEmailStats({ data: filters }),
    staleTime: 15_000,
  })
}

export function adminEmailHealthQueryOptions() {
  return queryOptions({
    queryKey: adminEmailsQueryKeys.health,
    queryFn: () => adminFetch<EmailProviderHealth>("/api/admin/emails/health"),
    staleTime: 60_000,
  })
}

export function adminEmailDetailQueryOptions(logId: number) {
  return queryOptions({
    queryKey: adminEmailsQueryKeys.detail(logId),
    queryFn: () => adminFetch<EmailLogDetail>(`/api/admin/emails/${logId}`),
    enabled: logId > 0,
  })
}

export function adminPurchaseEmailsQueryOptions(purchaseId: number) {
  return queryOptions({
    queryKey: adminEmailsQueryKeys.purchase(purchaseId),
    queryFn: () =>
      adminFetch<{ data: import("@/features/admin/emails/types").EmailLogRow[] }>(
        `/api/admin/purchases/${purchaseId}/emails`,
      ),
    enabled: purchaseId > 0,
  })
}

export type { EmailLogStats }
