import { createFileRoute } from "@tanstack/react-router"
import { AdminTicketsExplorer } from "@/features/admin/AdminTicketsExplorer"

export const Route = createFileRoute("/admin/boletos")({
  component: AdminTicketsExplorer,
})
