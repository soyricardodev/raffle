import { z } from "zod"
import { EmailType } from "../validators/index.js"

export const ADMIN_EMAILS_PAGE_SIZE = 50
export const EMAIL_LOG_EXPORT_MAX = 50_000

export const EmailLogStatusFilter = z.enum(["all", "sent", "failed", "pending", "error"])
export type EmailLogStatusFilter = z.infer<typeof EmailLogStatusFilter>

export const EmailTypeFilter = z.union([z.literal("all"), EmailType])
export type EmailTypeFilter = z.infer<typeof EmailTypeFilter>

export const EmailLogSortBy = z.enum(["created_at", "sent_at", "status"])
export const EmailLogSortDir = z.enum(["asc", "desc"])

export const AdminEmailListInput = z.object({
  limit: z.coerce.number().int().min(1).max(100).catch(ADMIN_EMAILS_PAGE_SIZE),
  page: z.coerce.number().int().min(1).catch(1),
  status: EmailLogStatusFilter.catch("all"),
  emailType: EmailTypeFilter.catch("all"),
  search: z.string().nullable().optional(),
  start: z.string().nullable().optional(),
  end: z.string().nullable().optional(),
  purchaseId: z.coerce.number().int().positive().nullable().optional(),
  sortBy: EmailLogSortBy.catch("created_at"),
  sortDir: EmailLogSortDir.catch("desc"),
})

export type AdminEmailListInput = z.infer<typeof AdminEmailListInput>

export type AdminEmailsRouteSearch = {
  status?: string
  type?: string
  q?: string
  start?: string
  end?: string
  page?: number
  limit?: number
  purchase?: number
  log?: number
  sortBy?: string
  sortDir?: string
}

export function normalizeAdminEmailListFilters(search: AdminEmailsRouteSearch): AdminEmailListInput {
  return AdminEmailListInput.parse({
    limit: search.limit ?? ADMIN_EMAILS_PAGE_SIZE,
    page: search.page ?? 1,
    status: search.status ?? "all",
    emailType: search.type ?? "all",
    search: search.q?.trim() || null,
    start: search.start || null,
    end: search.end || null,
    purchaseId: search.purchase && search.purchase > 0 ? search.purchase : null,
    sortBy: search.sortBy ?? "created_at",
    sortDir: search.sortDir ?? "desc",
  })
}

export function parseAdminEmailListFromUrl(url: URL): AdminEmailListInput {
  const purchase = url.searchParams.get("purchase")
  return AdminEmailListInput.parse({
    limit: url.searchParams.get("limit") ?? ADMIN_EMAILS_PAGE_SIZE,
    page: url.searchParams.get("page") ?? 1,
    status: url.searchParams.get("status") ?? "all",
    emailType: url.searchParams.get("type") ?? "all",
    search: url.searchParams.get("search") ?? url.searchParams.get("q") ?? null,
    start: url.searchParams.get("start"),
    end: url.searchParams.get("end"),
    purchaseId: purchase ? Number(purchase) : null,
    sortBy: url.searchParams.get("sortBy") ?? "created_at",
    sortDir: url.searchParams.get("sortDir") ?? "desc",
  })
}

export const SendPurchaseEmailInput = z.object({
  type: z.enum(["purchase_confirmation", "status_update"]).default("purchase_confirmation"),
  status: z.enum(["approved", "rejected"]).optional(),
})
