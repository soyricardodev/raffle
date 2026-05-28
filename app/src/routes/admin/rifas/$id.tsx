import { createFileRoute } from "@tanstack/react-router"
import { AdminRaffleDetail } from "@/features/admin/raffles/AdminRaffleDetail"

export const Route = createFileRoute("/admin/rifas/$id")({
  component: AdminRaffleDetailPage,
})

function AdminRaffleDetailPage() {
  const { id } = Route.useParams()
  return <AdminRaffleDetail raffleId={id} />
}
