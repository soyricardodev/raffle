import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/features/theme/ThemeToggle"
import { useSiteConfig } from "@/stores/site-config"

export function PublicHeader() {
  const siteName = useSiteConfig((s) => s.siteInfo.site_name)

  return (
    <header className="border-border/80 bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between gap-3 px-4">
        <Link to="/" className="font-heading truncate text-lg font-semibold tracking-tight">
          {siteName}
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link to="/">Inicio</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/verificar">Verificar</Link>
          </Button>
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">Admin</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
