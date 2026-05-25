import { createFileRoute } from "@tanstack/react-router"
import { AdminPlaceholderPage } from "@/features/admin/AdminPlaceholderPage"

export const Route = createFileRoute("/admin/analytics")({
  component: () => (
    <AdminPlaceholderPage
      title="Análisis de ventas"
      description="Gráficos Recharts y métricas — pendiente AnalyticsService (T-112)."
    />
  ),
})
