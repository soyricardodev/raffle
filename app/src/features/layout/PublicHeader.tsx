import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/features/theme/ThemeToggle"
import { usePublicBranding } from "@/features/layout/use-public-branding"
import { Search } from "lucide-react"

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
          <Button variant="ghost" size="icon" className="size-10" asChild aria-label="Verificar boletos">
            <Link to="/verificar">
              <Search className="size-5" />
            </Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
