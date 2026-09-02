import { createContext, type ReactNode, useContext } from "react"
import { usePwaEngage } from "@/features/pwa/use-pwa-engage"

type PwaEngage = ReturnType<typeof usePwaEngage>

const PwaEngageContext = createContext<PwaEngage | null>(null)

export function PwaEngageProvider({ children }: { children: ReactNode }) {
  const engage = usePwaEngage()
  return <PwaEngageContext.Provider value={engage}>{children}</PwaEngageContext.Provider>
}

export function usePwaEngageContext(): PwaEngage | null {
  return useContext(PwaEngageContext)
}
