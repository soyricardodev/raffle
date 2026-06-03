import type { QueryClient } from "@tanstack/react-query"
import { publicSiteConfigQueryOptions } from "@/features/layout/public-queries"
import { raffleLiveQueryOptions } from "@/features/raffle/raffle-live-queries"

export async function ensurePublicSiteConfig(queryClient: QueryClient) {
  return queryClient.ensureQueryData(publicSiteConfigQueryOptions()).catch(() => null)
}

export async function ensureRaffleLive(queryClient: QueryClient, raffleId: string | number) {
  return queryClient.ensureQueryData(raffleLiveQueryOptions(String(raffleId))).catch(() => null)
}
