import { createFileRoute } from "@tanstack/react-router"
import { AdminPurchasesView } from "@/features/admin/AdminPurchasesView"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"
import { adminPurchasesAccessQueryOptions } from "@/features/admin/purchases/admin-purchases-access-queries"
import {
  adminPurchasesDashboardQueryOptions,
  adminPurchasesInfiniteQueryOptions,
  getDefaultAdminPurchasesRaffleId,
  normalizeAdminPurchaseFilters,
} from "@/features/admin/purchases/admin-purchases-queries"

type ComprasSearch = {
  status?: string
  payment_method?: string
  raffle_id?: string
  q?: string
  start?: string
  end?: string
  sort?: string
  limit?: number
  /** Abre el drawer de detalle de esta compra */
  purchase?: number
}

export const Route = createFileRoute("/admin/compras")({
  validateSearch: (search: Record<string, unknown>): ComprasSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    payment_method: typeof search.payment_method === "string" ? search.payment_method : undefined,
    raffle_id: typeof search.raffle_id === "string" ? search.raffle_id : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    start: typeof search.start === "string" ? search.start : undefined,
    end: typeof search.end === "string" ? search.end : undefined,
    sort: typeof search.sort === "string" ? search.sort : undefined,
    limit: Number.isFinite(Number(search.limit)) ? Math.max(1, Number(search.limit)) : undefined,
    purchase: Number.isFinite(Number(search.purchase))
      ? Math.max(1, Number(search.purchase))
      : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const access = await queryClient
      .ensureQueryData(adminPurchasesAccessQueryOptions())
      .catch(() => null)
    if (access?.required && !access.unlocked) return

    const dashboard = await queryClient
      .ensureQueryData(adminPurchasesDashboardQueryOptions())
      .catch(() => null)
    const filters = normalizeAdminPurchaseFilters(deps, {
      defaultRaffleId: getDefaultAdminPurchasesRaffleId(dashboard),
    })
    await queryClient
      .prefetchInfiniteQuery({
        ...adminPurchasesInfiniteQueryOptions(filters),
        pages: 2,
      })
      .catch(() => null)
  },
  head: ({ matches }) => adminNavRouteHead(matches, "/admin/compras"),
  component: AdminPurchasesView,
})
