import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getClientSession } from "@/features/auth/auth-client"
import { AdminLayoutShell } from "@/features/layout/AdminLayoutShell"

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => {
    const session = getClientSession()
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.pathname },
      })
    }
    return { session }
  },
  component: AdminLayoutRoute,
})

function AdminLayoutRoute() {
  const { session } = Route.useRouteContext()

  return (
    <AdminLayoutShell session={session}>
      <Outlet />
    </AdminLayoutShell>
  )
}
