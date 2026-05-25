import { createFileRoute } from "@tanstack/react-router"
import { AdminEmailsPanel } from "@/features/admin/AdminEmailsPanel"

export const Route = createFileRoute("/admin/emails")({
  component: AdminEmailsPanel,
})
