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
