import type { UseQueryResult } from "@tanstack/react-query"
import { createContext, useContext } from "react"
import {
  useRaffleLiveStatus,
  type RaffleLiveStatus,
} from "@/features/raffle/raffle-live-queries"

type RaffleLiveQuery = UseQueryResult<RaffleLiveStatus | null, Error>

const RaffleLiveContext = createContext<RaffleLiveQuery | null>(null)

type RaffleLiveProviderProps = {
  raffleId: string | number
  enabled?: boolean
  children: React.ReactNode
}

export function RaffleLiveProvider({ raffleId, enabled = true, children }: RaffleLiveProviderProps) {
  const live = useRaffleLiveStatus(raffleId, { enabled })
  return <RaffleLiveContext.Provider value={live}>{children}</RaffleLiveContext.Provider>
}

/** Prefer parent `RaffleLiveProvider`; falls back to a local poll when absent. */
export function useRaffleLiveDataOrFetch(
  raffleId: string | number,
  options?: { enabled?: boolean },
): RaffleLiveQuery {
  const fromProvider = useContext(RaffleLiveContext)
  const enabled = options?.enabled ?? true
  const standalone = useRaffleLiveStatus(raffleId, {
    enabled: enabled && fromProvider == null,
  })
  return fromProvider ?? standalone
}
