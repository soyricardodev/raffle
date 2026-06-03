import { createFileRoute } from "@tanstack/react-router"
import { adminRouteHead } from "@/features/admin/admin-page-title"
import { AdminRaffleDetail } from "@/features/admin/raffles/AdminRaffleDetail"
import { adminRaffleDetailQueryOptions } from "@/features/admin/raffles/admin-raffle-detail-queries"
import { parseAdminRaffleHubSearch } from "@/features/admin/raffles/admin-raffle-hub"

export const Route = createFileRoute("/admin/rifas/$id")({
  validateSearch: parseAdminRaffleHubSearch,
  loader: async ({ params, context: { queryClient } }) => {
    const detail = await queryClient.ensureQueryData(adminRaffleDetailQueryOptions(params.id))
    return { raffleName: detail?.name?.trim() ?? null }
  },
  head: ({ matches, loaderData, params }) => {
    const search = matches.find((m) => m.routeId === "/admin/rifas/$id")?.search as
      | { tab?: "editar" }
      | undefined
    return adminRouteHead({
      matches,
      pathname: `/admin/rifas/${params.id}`,
      search,
      raffleName: loaderData?.raffleName,
    })
  },
  component: AdminRaffleDetailPage,
})

function AdminRaffleDetailPage() {
  const { id } = Route.useParams()
  return <AdminRaffleDetail raffleId={id} />
}
