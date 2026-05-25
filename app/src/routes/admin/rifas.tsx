import { createFileRoute } from "@tanstack/react-router"
import { AdminPlaceholderPage } from "@/features/admin/AdminPlaceholderPage"

export const Route = createFileRoute("/admin/rifas")({
  component: () => (
    <AdminPlaceholderPage
      title="Mis rifas"
      description="Listado, filtros y publicación — pendiente integración API (T-108)."
    />
  ),
})
