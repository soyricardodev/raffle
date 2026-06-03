import { createFileRoute } from "@tanstack/react-router"
import { AdminRafflesTable } from "@/features/admin/AdminRafflesTable"
import {
  adminRafflesQueryOptions,
  normalizeAdminRaffleFilters,
} from "@/features/admin/raffles/admin-raffles-queries"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"

export const Route = createFileRoute("/admin/rifas/")({
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const filters = normalizeAdminRaffleFilters(deps)
    await queryClient.ensureQueryData(adminRafflesQueryOptions(filters)).catch(() => null)
    return null
  },
  head: ({ matches }) => adminNavRouteHead(matches, "/admin/rifas"),
  component: AdminRafflesTable,
})
