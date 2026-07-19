import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { findHomeRaffleDisplay } from "@/server/raffle.service"

export const homeQueryKeys = {
  display: ["raffle", "home-display"] as const,
  /** @deprecated use homeQueryKeys.display */
  firstActive: ["raffle", "first-active"] as const,
}

export const fetchHomeRaffleDisplay = createServerFn({ method: "GET" }).handler(async () => {
  return findHomeRaffleDisplay()
})

/** Static shell: raffle content changes rarely during a session. */
const HOME_RAFFLE_STALE_MS = 120_000

export function homeRaffleDisplayQueryOptions() {
  return queryOptions({
    queryKey: homeQueryKeys.display,
    queryFn: () => fetchHomeRaffleDisplay(),
    staleTime: HOME_RAFFLE_STALE_MS,
  })
}

/** @deprecated use homeRaffleDisplayQueryOptions */
export function homeFirstActiveQueryOptions() {
  return queryOptions({
    queryKey: homeQueryKeys.firstActive,
    queryFn: async () => {
      const display = await fetchHomeRaffleDisplay()
      return display.active
    },
    staleTime: HOME_RAFFLE_STALE_MS,
  })
}
