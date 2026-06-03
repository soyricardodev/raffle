import type { QueryClient } from "@tanstack/react-query"
import { homeQueryKeys } from "@/features/home/home-queries"
import { raffleLiveQueryKeys } from "@/features/raffle/raffle-live-queries"
import { raffleQueryKeys } from "@/features/raffle/raffle-queries"
import { adminRaffleQueryKeys } from "@/features/admin/raffles/admin-raffle-detail-queries"

export async function invalidateAdminRaffleCaches(
  queryClient: QueryClient,
  raffleId?: string | number,
) {
  const invalidations: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({ queryKey: ["admin", "raffles"] }),
    queryClient.invalidateQueries({ queryKey: homeQueryKeys.firstActive }),
  ]

  if (raffleId != null) {
    const id = String(raffleId)

    invalidations.push(
      queryClient.invalidateQueries({ queryKey: adminRaffleQueryKeys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: raffleQueryKeys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: raffleLiveQueryKeys.status(id) }),
    )
  }

  await Promise.all(invalidations)
}
