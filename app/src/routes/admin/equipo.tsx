import { createFileRoute } from "@tanstack/react-router"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"
import { WorkforcePage } from "@/features/admin/workforce/WorkforcePage"
export const Route = createFileRoute("/admin/equipo")({
  head: ({ matches }) => adminNavRouteHead(matches, "/admin/equipo"),
  component: WorkforcePage,
})
