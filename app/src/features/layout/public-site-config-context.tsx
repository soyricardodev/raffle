import { createContext, useContext } from "react"
import type { PublicSiteConfigPayload } from "@/features/layout/public-queries"

const PublicSiteConfigContext = createContext<PublicSiteConfigPayload | null>(null)

export function PublicSiteConfigProvider({
  value,
  children,
}: {
  value: PublicSiteConfigPayload | null
  children: React.ReactNode
}) {
  return (
    <PublicSiteConfigContext.Provider value={value}>{children}</PublicSiteConfigContext.Provider>
  )
}

export function usePublicSiteConfigFromLayout(): PublicSiteConfigPayload | null {
  return useContext(PublicSiteConfigContext)
}
