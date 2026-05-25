import { createFileRoute } from "@tanstack/react-router"
import { AdminRafflesTable } from "@/features/admin/AdminRafflesTable"

export const Route = createFileRoute("/admin/rifas")({
  component: AdminRafflesTable,
})
