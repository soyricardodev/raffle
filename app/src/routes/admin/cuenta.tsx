import { createFileRoute } from "@tanstack/react-router"
import { AdminAccountPage } from "@/features/auth/ChangePasswordForm"
import { ADMIN_ACCOUNT_PAGE_TITLE, adminRouteHead } from "@/features/admin/admin-page-title"

export const Route = createFileRoute("/admin/cuenta")({
  head: ({ matches }) =>
    adminRouteHead({ matches, pageTitle: ADMIN_ACCOUNT_PAGE_TITLE }),
  component: AdminAccountPage,
})
