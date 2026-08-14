import { useSiteFavicon } from "@/features/layout/use-site-favicon"
import { useSyncPublicSiteConfig } from "@/features/layout/use-sync-public-site-config"
import { useInAppBrowserRedirect } from "@/hooks/useInAppBrowserRedirect"
import { PublicFooter } from "./PublicFooter"
import { PublicHeader } from "./PublicHeader"
import { SupportFab } from "./SupportFab"
import { TelegramChannelBanner } from "./TelegramChannelBanner"

type PublicLayoutProps = {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  useInAppBrowserRedirect()
  useSyncPublicSiteConfig()
  useSiteFavicon()

  return (
    <div className="bg-background flex min-h-svh flex-col">
      <div className="bg-background sticky top-0 z-40">
        <TelegramChannelBanner />
        <PublicHeader />
      </div>
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <SupportFab />
    </div>
  )
}
