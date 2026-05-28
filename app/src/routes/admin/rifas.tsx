import { createFileRoute } from "@tanstack/react-router"
import { AdminRafflesTable } from "@/features/admin/AdminRafflesTable"
import {
  adminRafflesQueryOptions,
  normalizeAdminRaffleFilters,
} from "@/features/admin/raffles/admin-raffles-queries"

type RifasSearch = {
  status?: string
  q?: string
  page?: number
  limit?: number
}

export const Route = createFileRoute("/admin/rifas")({
  validateSearch: (search: Record<string, unknown>): RifasSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    page: Number.isFinite(Number(search.page))
      ? Math.max(1, Number(search.page))
      : undefined,
    limit: Number.isFinite(Number(search.limit))
      ? Math.max(1, Number(search.limit))
      : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const filters = normalizeAdminRaffleFilters(deps)
    await queryClient
      .ensureQueryData(adminRafflesQueryOptions(filters))
      .catch(() => null)
    return null
  },
  component: AdminRafflesTable,
})
