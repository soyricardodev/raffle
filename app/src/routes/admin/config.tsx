import { createFileRoute } from "@tanstack/react-router"
import { AdminConfigView } from "@/features/admin/AdminConfigView"

export const Route = createFileRoute("/admin/config")({
  component: AdminConfigView,
})
