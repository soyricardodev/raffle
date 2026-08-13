import { Link } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildVerifyHref } from "@/features/verify/build-verify-href"
import { usePublicBranding } from "@/features/layout/use-public-branding"
import { ThemeToggle } from "@/features/theme/ThemeToggle"

export function PublicHeader() {
  const branding = usePublicBranding()
  const siteName = branding?.siteInfo.site_name ?? ""
  const logoUrl = branding?.images.logo ?? ""

  return (
    <header className="border-border/60 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-2 px-4">
        <Link
          to="/"
          className="font-heading flex min-w-0 items-center gap-2 text-base font-bold tracking-tight sm:text-lg"
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
        <nav className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            className="h-9 gap-1.5 px-2.5 text-xs font-semibold shadow-sm ring-2 ring-primary/35 sm:h-10 sm:px-3 sm:text-sm"
            asChild
          >
            <Link {...buildVerifyHref()}>
              <Search className="size-3.5 shrink-0 sm:size-4" aria-hidden />
              <span className="max-w-[7.5rem] truncate sm:max-w-none">Buscar mis boletos</span>
            </Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
