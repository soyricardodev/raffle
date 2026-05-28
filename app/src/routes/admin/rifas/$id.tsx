import { createFileRoute } from "@tanstack/react-router"
import { AdminRaffleDetail } from "@/features/admin/raffles/AdminRaffleDetail"
import { adminRaffleDetailQueryOptions } from "@/features/admin/raffles/admin-raffle-detail-queries"

export const Route = createFileRoute("/admin/rifas/$id")({
  loader: ({ params, context: { queryClient } }) =>
    queryClient.ensureQueryData(adminRaffleDetailQueryOptions(params.id)),
  component: AdminRaffleDetailPage,
})

function AdminRaffleDetailPage() {
  const { id } = Route.useParams()
  return <AdminRaffleDetail raffleId={id} />
}
