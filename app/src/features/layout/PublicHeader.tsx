import { Link } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePublicBranding } from "@/features/layout/use-public-branding"
import { ThemeToggle } from "@/features/theme/ThemeToggle"

export function PublicHeader() {
  const branding = usePublicBranding()
  const siteName = branding?.siteInfo.site_name ?? ""
  const logoUrl = branding?.images.logo ?? ""

  return (
    <header className="border-border/60 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4">
        <Link
          to="/"
          className="font-heading flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
          style={{ color: "var(--brand-primary, inherit)" }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="size-8 shrink-0 rounded-md object-contain"
              width={32}
              height={32}
            />
          ) : null}
          {siteName ? <span className="truncate">{siteName}</span> : null}
        </Link>
        <nav className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-10 gap-1.5 px-2.5" asChild>
            <Link to="/verificar">
              <Search className="size-4 shrink-0" aria-hidden />
              Verificar Boletos
            </Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
