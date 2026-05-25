import { createFileRoute } from "@tanstack/react-router"
import { CreateRaffleForm } from "@/features/admin/CreateRaffleForm"

export const Route = createFileRoute("/admin/crear")({
  component: CreateRaffleForm,
})
