import { createFileRoute } from "@tanstack/react-router"
import { AdminPlaceholderPage } from "@/features/admin/AdminPlaceholderPage"

export const Route = createFileRoute("/admin/boletos")({
  component: () => (
    <AdminPlaceholderPage
      title="Boletos vendidos"
      description="Explorador de tickets y compras — pendiente Fase 4."
    />
  ),
})
