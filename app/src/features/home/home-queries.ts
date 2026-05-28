import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { findFirstActiveRaffle, getPublishedRaffles } from "@/server/raffle.service"

export const HOME_PUBLISHED_LIMIT = 10
export const HOME_PUBLISHED_PAGE = 1

export const homeQueryKeys = {
  firstActive: ["raffle", "first-active"] as const,
  published: (limit = HOME_PUBLISHED_LIMIT, page = HOME_PUBLISHED_PAGE) =>
    ["raffles", "published", { limit, page }] as const,
}

export const fetchHomeFirstActive = createServerFn({ method: "GET" }).handler(async () => {
  return findFirstActiveRaffle()
})

export const fetchHomePublished = createServerFn({ method: "GET" }).handler(async () => {
  return getPublishedRaffles(HOME_PUBLISHED_LIMIT, HOME_PUBLISHED_PAGE)
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

export function homePublishedQueryOptions(
  limit = HOME_PUBLISHED_LIMIT,
  page = HOME_PUBLISHED_PAGE,
) {
  return queryOptions({
    queryKey: homeQueryKeys.published(limit, page),
    queryFn: () => fetchHomePublished(),
    staleTime: HOME_RAFFLE_STALE_MS,
  })
}
