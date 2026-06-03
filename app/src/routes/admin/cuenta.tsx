import { createFileRoute } from "@tanstack/react-router"
import { AdminAccountPage } from "@/features/auth/ChangePasswordForm"

export const Route = createFileRoute("/admin/cuenta")({
  component: AdminAccountPage,
})
