import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireAdminMiddleware } from "@/features/admin/shared/admin-auth-middleware"
import { listEmailLogs } from "@/server/email-logs.service"

export const ADMIN_EMAILS_PAGE_SIZE = 50

const EmailStatusFilter = z
  .enum(["all", "sent", "failed", "pending", "error"])
  .catch("all")

const AdminEmailsInput = z.object({
  limit: z.number().int().min(1).max(100).catch(ADMIN_EMAILS_PAGE_SIZE),
  page: z.number().int().min(1).catch(1),
  status: EmailStatusFilter,
  search: z.string().nullable().optional(),
  start: z.string().nullable().optional(),
  end: z.string().nullable().optional(),
})

export type AdminEmailFilters = z.infer<typeof AdminEmailsInput>

export type AdminEmailsSearchParams = {
  status?: string
  q?: string
  start?: string
  end?: string
  page?: number
  limit?: number
}

export const adminEmailsQueryKeys = {
  list: (filters: AdminEmailFilters) =>
    ["admin", "emails", "list", filters] as const,
}

export const fetchAdminEmails = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .inputValidator(AdminEmailsInput)
  .handler(async ({ data }) => {
    return listEmailLogs({
      limit: data.limit,
      page: data.page,
      status: data.status,
      search: data.search,
      start: data.start,
      end: data.end,
    })
  })

export function normalizeAdminEmailFilters(
  search: AdminEmailsSearchParams
): AdminEmailFilters {
  return AdminEmailsInput.parse({
    limit: search.limit ?? ADMIN_EMAILS_PAGE_SIZE,
    page: search.page ?? 1,
    status: search.status ?? "all",
    search: search.q?.trim() || null,
    start: search.start || null,
    end: search.end || null,
  })
}

export function adminEmailsQueryOptions(filters: AdminEmailFilters) {
  return queryOptions({
    queryKey: adminEmailsQueryKeys.list(filters),
    queryFn: () => fetchAdminEmails({ data: filters }),
    staleTime: 15_000,
  })
}
