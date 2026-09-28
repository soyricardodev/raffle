import { useMatches, useRouterState } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
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
  const [permissions, setPermissions] = useState<string[]>()
  const lastInteraction = useRef(Date.now())
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

  useEffect(() => {
    let cancelled = false
    void fetch("/api/admin/workforce/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.permissions) setPermissions(data.permissions)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const markActive = () => {
      lastInteraction.current = Date.now()
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        markActive()
        beat()
      }
    }
    const beat = () => {
      if (
        document.visibilityState !== "visible" ||
        Date.now() - lastInteraction.current > 5 * 60_000
      )
        return
      void fetch("/api/admin/workforce/heartbeat", { method: "POST" })
        .then((response) => {
          if (response.status === 401) window.location.href = "/login"
        })
        .catch(() => {})
    }
    beat()
    const timer = window.setInterval(beat, 60_000)
    document.addEventListener("visibilitychange", onVisible)
    document.addEventListener("pointerdown", markActive, { passive: true })
    document.addEventListener("keydown", markActive)
    document.addEventListener("scroll", markActive, { passive: true })
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      document.removeEventListener("pointerdown", markActive)
      document.removeEventListener("keydown", markActive)
      document.removeEventListener("scroll", markActive)
    }
  }, [])

  async function handleLogout() {
    await signOut()
    window.location.href = "/login"
  }

  return (
    <SidebarProvider defaultOpen>
      <AdminSidebarNav
        session={session}
        permissions={permissions}
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
