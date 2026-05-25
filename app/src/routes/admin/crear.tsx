import { createFileRoute } from "@tanstack/react-router"
import { AdminPlaceholderPage } from "@/features/admin/AdminPlaceholderPage"

export const Route = createFileRoute("/admin/crear")({
  component: () => (
    <AdminPlaceholderPage
      title="Nueva rifa"
      description="Formulario de creación con uploads — pendiente T-406."
    />
  ),
})
