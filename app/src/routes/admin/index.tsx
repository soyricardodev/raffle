import { createFileRoute } from "@tanstack/react-router"
import { AdminDashboardPlaceholder } from "@/features/admin/AdminDashboardPlaceholder"

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  return <AdminDashboardPlaceholder />
}
