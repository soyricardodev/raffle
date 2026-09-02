import { Link } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePublicBranding } from "@/features/layout/use-public-branding"
import { PushInboxBell } from "@/features/pwa/PushInboxBell"
import { PwaInstallHeaderButton } from "@/features/pwa/PwaInstallHeaderButton"
import { PWA_NAME } from "@/features/pwa/pwa-brand"
import { ThemeToggle } from "@/features/theme/ThemeToggle"
import { buildVerifyHref } from "@/features/verify/build-verify-href"

export function PublicHeader() {
  const branding = usePublicBranding()
  const siteName = PWA_NAME
  const logoUrl = branding?.images.logo ?? ""

  return (
    <header className="border-border/60 bg-background/90 border-b backdrop-blur-md">
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
          <PwaInstallHeaderButton />
          <PushInboxBell />
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 px-2.5 text-xs font-semibold sm:h-10 sm:px-3 sm:text-sm"
            asChild
          >
            <Link {...buildVerifyHref()}>
              <Search className="size-3.5 shrink-0 sm:size-4" aria-hidden />
              <span className="max-w-[6.5rem] truncate sm:max-w-none">Buscar mis boletos</span>
            </Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
