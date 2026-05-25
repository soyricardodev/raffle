import { createFileRoute } from "@tanstack/react-router"
import { AdminPlaceholderPage } from "@/features/admin/AdminPlaceholderPage"

export const Route = createFileRoute("/admin/config")({
  component: () => (
    <AdminPlaceholderPage
      title="Configuración del sitio"
      description="Tabs general, diseño, social, contacto y email — pendiente T-410."
    />
  ),
})
