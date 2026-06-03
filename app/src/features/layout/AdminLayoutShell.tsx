import { useMatches, useRouterState } from "@tanstack/react-router"
import { useEffect } from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { raffleNameFromMatches, resolveAdminPageTitle } from "@/features/admin/admin-page-title"
import { AdminSidebarNav } from "@/features/admin/shared/AdminSidebarNav"
import { signOut } from "@/features/auth/auth-client"
import type { AuthSession } from "@/features/auth/types"
import { useSiteConfig } from "@/stores/site-config"

type AdminLayoutShellProps = {
  session: AuthSession
  children: React.ReactNode
}

export function AdminLayoutShell({ session, children }: AdminLayoutShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const search = useRouterState({ select: (s) => s.location.search })
  const matches = useMatches()
  const pageTitle = resolveAdminPageTitle({
    pathname,
    search: search as { tab?: "editar" },
    raffleName: raffleNameFromMatches(matches),
  })
  const siteName = useSiteConfig((s) => s.siteInfo.site_name)
  const loaded = useSiteConfig((s) => s.loaded)
  const setFromApi = useSiteConfig((s) => s.setFromApi)

  useEffect(() => {
    if (loaded) return
    fetch("/api/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        setFromApi({
          site_colors: data.site_colors,
          site_info: data.site_info,
          contact_info: data.contact_info,
        })
      })
      .catch(() => {})
  }, [loaded, setFromApi])

  async function handleLogout() {
    await signOut()
    window.location.href = "/login"
  }

  return (
    <SidebarProvider defaultOpen>
      <AdminSidebarNav
        session={session}
        siteName={siteName}
        pathname={pathname}
        onLogout={() => void handleLogout()}
      />

      <SidebarInset>
        <header className="bg-background/95 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur md:hidden">
          <SidebarTrigger className="-ml-1" />
          <span className="font-heading truncate font-medium">{pageTitle}</span>
        </header>

        <div className="min-w-0 flex-1 pb-[env(safe-area-inset-bottom)]">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
