import { createFileRoute } from "@tanstack/react-router"
import type { AdminEmailsRouteSearch } from "@raffle/shared/admin/email-list-filters"
import { AdminEmailsPanel } from "@/features/admin/AdminEmailsPanel"
import {
  adminEmailsQueryOptions,
  adminEmailStatsQueryOptions,
  normalizeAdminEmailFilters,
} from "@/features/admin/emails/admin-emails-queries"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"

export const Route = createFileRoute("/admin/emails")({
  validateSearch: (search: Record<string, unknown>): AdminEmailsRouteSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    type: typeof search.type === "string" ? search.type : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    start: typeof search.start === "string" ? search.start : undefined,
    end: typeof search.end === "string" ? search.end : undefined,
    page: Number.isFinite(Number(search.page)) ? Math.max(1, Number(search.page)) : undefined,
    limit: Number.isFinite(Number(search.limit)) ? Math.max(1, Number(search.limit)) : undefined,
    purchase: Number.isFinite(Number(search.purchase))
      ? Math.max(1, Number(search.purchase))
      : undefined,
    log: Number.isFinite(Number(search.log)) ? Math.max(1, Number(search.log)) : undefined,
    sortBy: typeof search.sortBy === "string" ? search.sortBy : undefined,
    sortDir: typeof search.sortDir === "string" ? search.sortDir : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const filters = normalizeAdminEmailFilters(deps)
    await Promise.all([
      queryClient.ensureQueryData(adminEmailsQueryOptions(filters)).catch(() => null),
      queryClient.ensureQueryData(adminEmailStatsQueryOptions(filters)).catch(() => null),
    ])
    return null
  },
  head: ({ matches }) => adminNavRouteHead(matches, "/admin/emails"),
  component: AdminEmailsPanel,
})
