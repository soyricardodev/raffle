import { createFileRoute } from "@tanstack/react-router"
import { AdminPurchasesView } from "@/features/admin/AdminPurchasesView"
import {
  adminPurchasesQueryOptions,
  normalizeAdminPurchaseFilters,
} from "@/features/admin/purchases/admin-purchases-queries"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"

type ComprasSearch = {
  status?: string
  raffle_id?: string
  q?: string
  start?: string
  end?: string
  page?: number
  limit?: number
  /** Abre el drawer de detalle de esta compra */
  purchase?: number
}

export const Route = createFileRoute("/admin/compras")({
  validateSearch: (search: Record<string, unknown>): ComprasSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    raffle_id: typeof search.raffle_id === "string" ? search.raffle_id : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    start: typeof search.start === "string" ? search.start : undefined,
    end: typeof search.end === "string" ? search.end : undefined,
    page: Number.isFinite(Number(search.page)) ? Math.max(1, Number(search.page)) : undefined,
    limit: Number.isFinite(Number(search.limit)) ? Math.max(1, Number(search.limit)) : undefined,
    purchase: Number.isFinite(Number(search.purchase))
      ? Math.max(1, Number(search.purchase))
      : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const filters = normalizeAdminPurchaseFilters(deps)
    await queryClient.ensureQueryData(adminPurchasesQueryOptions(filters)).catch(() => null)
  },
  head: ({ matches }) => adminNavRouteHead(matches, "/admin/compras"),
  component: AdminPurchasesView,
})
