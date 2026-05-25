import { createFileRoute } from "@tanstack/react-router"
import { AdminPlaceholderPage } from "@/features/admin/AdminPlaceholderPage"

export const Route = createFileRoute("/admin/emails")({
  component: () => (
    <AdminPlaceholderPage
      title="Logs de email"
      description="Historial, reenvío y test — pendiente T-411 / T-212."
    />
  ),
})
