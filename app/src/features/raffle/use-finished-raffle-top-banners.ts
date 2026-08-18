import { useQuery } from "@tanstack/react-query"
import { useRouterState } from "@tanstack/react-router"
import { homeRaffleDisplayQueryOptions } from "@/features/home/home-queries"
import {
  FORCE_NEXT_RAFFLE_COMING_BANNER,
  shouldShowNextRaffleComingBanner,
} from "@/features/raffle/next-raffle-coming"

export function useFinishedRaffleTopBanners() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const hideOnThisPage = pathname === "/login"
  const displayQuery = useQuery({
    ...homeRaffleDisplayQueryOptions(),
    enabled: !hideOnThisPage,
  })

  const visible =
    !hideOnThisPage &&
    shouldShowNextRaffleComingBanner({
      force: FORCE_NEXT_RAFFLE_COMING_BANNER,
      hasActiveRaffle: displayQuery.data?.active != null,
      latestFinished: displayQuery.data?.latestFinished ?? null,
    })

  return { visible }
}
