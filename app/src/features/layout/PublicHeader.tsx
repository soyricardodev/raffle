import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/features/theme/ThemeToggle"
import { useSiteConfig } from "@/stores/site-config"
import { Search } from "lucide-react"

export function PublicHeader() {
  const siteName = useSiteConfig((s) => s.siteInfo.site_name)

  return (
    <header className="border-border/60 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4">
        <Link
          to="/"
          className="font-heading truncate text-base font-semibold tracking-tight sm:text-lg"
        >
          {siteName}
        </Link>
        <nav className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-10" asChild aria-label="Verificar boletos">
            <Link to="/verificar">
              <Search className="size-5" />
            </Link>
          </Button>
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="hidden text-xs sm:inline-flex" asChild>
            <Link to="/login">Admin</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
