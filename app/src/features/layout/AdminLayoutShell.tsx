import { Link, useRouterState } from "@tanstack/react-router"
import { LogOut, Menu, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { adminNavItems } from "@/features/admin/nav"
import { ThemeToggle } from "@/features/theme/ThemeToggle"
import { signOut } from "@/features/auth/auth-client"
import type { AuthSession } from "@/features/auth/types"
import { cn } from "@/lib/utils"
import { useSiteConfig } from "@/stores/site-config"

type AdminLayoutShellProps = {
  session: AuthSession
  children: React.ReactNode
}

export function AdminLayoutShell({ session, children }: AdminLayoutShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
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

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin"
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  async function handleLogout() {
    await signOut()
    window.location.href = "/login"
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-border/80 border-b px-4 py-4">
        <p className="font-heading text-sm font-semibold">{siteName}</p>
        <p className="text-muted-foreground text-xs">Panel admin</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {adminNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
      <div className="border-border/80 space-y-2 border-t p-3">
        <div className="flex justify-center px-3">
          <ThemeToggle />
        </div>
        <div className="text-muted-foreground px-3 text-xs">
          {session.user.username} · {session.user.role}
        </div>
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )

  return (
    <div className="bg-muted/20 min-h-svh">
      <div className="lg:hidden sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </Button>
        <span className="font-medium">Admin</span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="bg-sidebar relative h-full w-72 max-w-[85vw] shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="size-5" />
            </Button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-svh max-w-[1600px]">
        <aside className="bg-sidebar border-border/80 hidden w-64 shrink-0 border-r lg:block">
          {sidebar}
        </aside>
        <div className="min-w-0 flex-1">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
