import { createFileRoute } from "@tanstack/react-router"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"
import { AdminPushPanel } from "@/features/admin/push/AdminPushPanel"
import { adminPushQueryOptions } from "@/features/admin/push/admin-push-queries"

export const Route = createFileRoute("/admin/avisos")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(adminPushQueryOptions()).catch(() => null)
    return null
  },
  head: ({ matches }) => adminNavRouteHead(matches, "/admin/avisos"),
  component: AdminPushPanel,
})
