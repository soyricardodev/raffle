import { useInAppBrowserRedirect } from "@/hooks/useInAppBrowserRedirect"
import { useSyncPublicSiteConfig } from "@/features/layout/use-sync-public-site-config"
import { PublicFooter } from "./PublicFooter"
import { PublicHeader } from "./PublicHeader"
import { WhatsAppFab } from "./WhatsAppFab"

type PublicLayoutProps = {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  useInAppBrowserRedirect()
  useSyncPublicSiteConfig()

  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <WhatsAppFab />
    </div>
  )
}
