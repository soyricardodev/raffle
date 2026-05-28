import { createFileRoute } from "@tanstack/react-router"
import { EditRaffleForm } from "@/features/admin/EditRaffleForm"
import { adminRaffleDetailQueryOptions } from "@/features/admin/raffles/admin-raffle-detail-queries"

export const Route = createFileRoute("/admin/edit/$id")({
  loader: ({ params, context: { queryClient } }) =>
    queryClient.ensureQueryData(adminRaffleDetailQueryOptions(params.id)),
  component: AdminEditRafflePage,
})

function AdminEditRafflePage() {
  const { id } = Route.useParams()
  return <EditRaffleForm raffleId={id} />
}
