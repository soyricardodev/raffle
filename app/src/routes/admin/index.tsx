import { createFileRoute } from "@tanstack/react-router"
import { AdminDashboard } from "@/features/admin/AdminDashboard"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"

export const Route = createFileRoute("/admin/")({
  head: ({ matches }) => adminNavRouteHead(matches, "/admin"),
  component: AdminDashboard,
})
