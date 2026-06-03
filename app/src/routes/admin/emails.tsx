import { createFileRoute } from "@tanstack/react-router"
import { AdminEmailsPanel } from "@/features/admin/AdminEmailsPanel"
import {
  adminEmailsQueryOptions,
  normalizeAdminEmailFilters,
} from "@/features/admin/emails/admin-emails-queries"

type EmailsSearch = {
  status?: string
  q?: string
  start?: string
  end?: string
  page?: number
  limit?: number
}

export const Route = createFileRoute("/admin/emails")({
  validateSearch: (search: Record<string, unknown>): EmailsSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    start: typeof search.start === "string" ? search.start : undefined,
    end: typeof search.end === "string" ? search.end : undefined,
    page: Number.isFinite(Number(search.page)) ? Math.max(1, Number(search.page)) : undefined,
    limit: Number.isFinite(Number(search.limit)) ? Math.max(1, Number(search.limit)) : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const filters = normalizeAdminEmailFilters(deps)
    await queryClient.ensureQueryData(adminEmailsQueryOptions(filters)).catch(() => null)
    return null
  },
  component: AdminEmailsPanel,
})
