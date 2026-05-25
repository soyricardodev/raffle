import { useEffect } from "react"
import { useSiteConfig } from "@/stores/site-config"
import { PublicFooter } from "./PublicFooter"
import { PublicHeader } from "./PublicHeader"

type PublicLayoutProps = {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const applyCssVariables = useSiteConfig((s) => s.applyCssVariables)

  useEffect(() => {
    applyCssVariables()
  }, [applyCssVariables])

  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
