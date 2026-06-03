import { createFileRoute } from "@tanstack/react-router"
import { CreateRaffleForm } from "@/features/admin/CreateRaffleForm"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"

export const Route = createFileRoute("/admin/crear")({
  head: ({ matches }) => adminNavRouteHead(matches, "/admin/crear"),
  component: CreateRaffleForm,
})
