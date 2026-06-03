import { ListIcon } from "@phosphor-icons/react"
import { Link, useRouterState } from "@tanstack/react-router"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { adminNavItems } from "@/features/admin/nav"
import { AdminSidebarNav } from "@/features/admin/shared/AdminSidebarNav"
import { signOut } from "@/features/auth/auth-client"
import type { AuthSession } from "@/features/auth/types"
import { cn } from "@/lib/utils"
import { useSiteConfig } from "@/stores/site-config"

type AdminLayoutShellProps = {
  session: AuthSession
  children: React.ReactNode
}

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function MobileSidebarOpenButton() {
  const { setOpenMobile } = useSidebar()

  return (
    <Button
      type="button"
      variant="ghost"
      className="text-muted-foreground flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-none px-1 text-[10px] font-medium focus-visible:ring-3 focus-visible:ring-ring/30"
      onClick={() => setOpenMobile(true)}
      aria-label="Abrir menú completo"
    >
      <ListIcon className="size-5" />
      <span>Más</span>
    </Button>
  )
}

export function AdminLayoutShell({ session, children }: AdminLayoutShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
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
          <span className="font-heading truncate font-medium">{siteName}</span>
        </header>

        <div className="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">{children}</div>
        </div>

        <nav
          className="bg-background/95 border-border/80 fixed inset-x-0 bottom-0 z-40 flex border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          aria-label="Navegación principal"
        >
          {adminNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon
            const active = isNavActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="truncate">{item.shortName}</span>
              </Link>
            )
          })}
          <MobileSidebarOpenButton />
        </nav>
      </SidebarInset>
    </SidebarProvider>
  )
}
