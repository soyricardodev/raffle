import { useSiteFavicon } from "@/features/layout/use-site-favicon"
import { useSyncPublicSiteConfig } from "@/features/layout/use-sync-public-site-config"
import { PwaEngageRoot } from "@/features/pwa/PwaEngageRoot"
import { PwaEngageProvider } from "@/features/pwa/pwa-engage-context"
import { NextRaffleComingBanner } from "@/features/raffle/NextRaffleComingBanner"
import { PublicFooter } from "./PublicFooter"
import { PublicHeader } from "./PublicHeader"
import { SupportFab } from "./SupportFab"

type PublicLayoutProps = {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  useSyncPublicSiteConfig()
  useSiteFavicon()

  return (
    <PwaEngageProvider>
      <div className="public-shell bg-background flex min-h-svh flex-col">
        <div className="bg-background sticky top-0 z-40">
          <NextRaffleComingBanner />
          <PublicHeader />
        </div>
        <main className="flex-1">{children}</main>
        <PublicFooter />
        <SupportFab />
        <PwaEngageRoot />
      </div>
    </PwaEngageProvider>
  )
}
