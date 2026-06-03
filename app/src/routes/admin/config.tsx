import { createFileRoute } from "@tanstack/react-router"
import { AdminConfigView } from "@/features/admin/AdminConfigView"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"

export const Route = createFileRoute("/admin/config")({
  head: ({ matches }) => adminNavRouteHead(matches, "/admin/config"),
  component: AdminConfigView,
})
