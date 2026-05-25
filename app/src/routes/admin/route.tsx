import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router"
import { useEffect } from "react"
import { authClient } from "@/features/auth/auth-client"
import { mapAuthSession } from "@/features/auth/session"
import { AdminLayoutShell } from "@/features/layout/AdminLayoutShell"

export const Route = createFileRoute("/admin")({
  component: AdminLayoutRoute,
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
