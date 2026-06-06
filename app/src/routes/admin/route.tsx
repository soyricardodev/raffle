import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router"
import { useEffect } from "react"
import { authClient } from "@/features/auth/auth-client"
import { mapAuthSession } from "@/features/auth/session"
import { adminUserPreferencesQueryOptions } from "@/features/admin/preferences/admin-user-preferences-queries"
import { adminLayoutLoaderData, buildAdminLayoutHead } from "@/features/layout/document-head"
import { ensurePublicSiteConfig } from "@/features/layout/public-page-loader"
import { AdminLayoutShell } from "@/features/layout/AdminLayoutShell"
import { AdminRouteError, AdminRouteNotFound } from "@/features/layout/RouteErrorFallback"

export const Route = createFileRoute("/admin")({
  loader: async ({ context: { queryClient } }) => {
    const siteConfig = await ensurePublicSiteConfig(queryClient)
    await queryClient.ensureQueryData(adminUserPreferencesQueryOptions()).catch(() => null)
    return adminLayoutLoaderData(siteConfig)
  },
  head: () => buildAdminLayoutHead(),
  component: AdminLayoutRoute,
  errorComponent: AdminRouteError,
  notFoundComponent: AdminRouteNotFound,
})

function AdminLayoutRoute() {
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
    <AdminLayoutShell session={session}>
      <Outlet />
    </AdminLayoutShell>
  )
}
