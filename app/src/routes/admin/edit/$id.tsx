import { createFileRoute } from "@tanstack/react-router"
import { EditRaffleForm } from "@/features/admin/EditRaffleForm"

export const Route = createFileRoute("/admin/edit/$id")({
  component: AdminEditRafflePage,
})

function AdminEditRafflePage() {
  const { id } = Route.useParams()
  return <EditRaffleForm raffleId={id} />
}
