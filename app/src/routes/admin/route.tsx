import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import { useEffect } from "react"
import { firstAccessibleAdminPage, permissionForAdminPage } from "@/features/admin/nav"
import { adminUserPreferencesQueryOptions } from "@/features/admin/preferences/admin-user-preferences-queries"
import { fetchAdminNavigationPermissions } from "@/features/admin/shared/admin-navigation-access"
import { authClient } from "@/features/auth/auth-client"
import { mapAuthSession } from "@/features/auth/session"
import { AdminLayoutShell } from "@/features/layout/AdminLayoutShell"
import { adminLayoutLoaderData, buildAdminLayoutHead } from "@/features/layout/document-head"
import { ensurePublicSiteConfig } from "@/features/layout/public-page-loader"
import { AdminRouteError, AdminRouteNotFound } from "@/features/layout/RouteErrorFallback"

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const adminPermissions = await fetchAdminNavigationPermissions()
    if (!adminPermissions) throw redirect({ to: "/login", search: { redirect: location.pathname } })
    const requiredPermission = permissionForAdminPage(location.pathname)
    if (requiredPermission && !adminPermissions.includes(requiredPermission))
      throw redirect({ to: firstAccessibleAdminPage(adminPermissions) })
    return { adminPermissions }
  },
  loader: async ({ context: { queryClient, adminPermissions } }) => {
    const siteConfig = await ensurePublicSiteConfig(queryClient)
    await queryClient.ensureQueryData(adminUserPreferencesQueryOptions()).catch(() => null)
    return { ...adminLayoutLoaderData(siteConfig), adminPermissions }
  },
  head: () => buildAdminLayoutHead(),
  component: AdminLayoutRoute,
  errorComponent: AdminRouteError,
  notFoundComponent: AdminRouteNotFound,
})

function AdminLayoutRoute() {
  const { adminPermissions } = Route.useLoaderData()
  const { data: sessionData, isPending } = authClient.useSession()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  useEffect(() => {
    if (!isPending && !sessionData) {
      void navigate({ to: "/login", search: { redirect: pathname } })
    }
  }, [isPending, sessionData, navigate, pathname])

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Verificando sesión…</p>
      </div>
    )
  }

  const session = mapAuthSession(sessionData)
  if (!session) return null

  return (
    <AdminLayoutShell session={session} permissions={adminPermissions}>
      <Outlet />
    </AdminLayoutShell>
  )
}
