import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { findFirstActiveRaffle } from "@/server/raffle.service"

export const homeQueryKeys = {
  firstActive: ["raffle", "first-active"] as const,
}

export const fetchHomeFirstActive = createServerFn({ method: "GET" }).handler(async () => {
  return findFirstActiveRaffle()
})

/** Static shell: raffle content changes rarely during a session. */
const HOME_RAFFLE_STALE_MS = 120_000

export function homeFirstActiveQueryOptions() {
  return queryOptions({
    queryKey: homeQueryKeys.firstActive,
    queryFn: () => fetchHomeFirstActive(),
    staleTime: HOME_RAFFLE_STALE_MS,
  })
}
