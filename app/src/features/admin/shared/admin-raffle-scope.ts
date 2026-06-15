import type { AdminDashboardStats } from "@/features/admin/purchases/admin-purchases-queries"

export function resolveAdminRaffleScopeFromSearch(
  raffleIdParam: string | undefined,
  defaultRaffleId?: string | null,
): string | null {
  if (raffleIdParam === "all") return null
  return raffleIdParam || defaultRaffleId || null
}

export function getDefaultAdminRaffleId(
  dashboard?: AdminDashboardStats | null,
  options?: { includePausedFallback?: boolean },
): string | null {
  const activeRaffle = dashboard?.filter_raffles.find((raffle) => raffle.status === "active")
  if (activeRaffle) return String(activeRaffle.id)

  if (!options?.includePausedFallback) return null

  const pausedRaffle = dashboard?.filter_raffles.find((raffle) => raffle.status === "paused")
  return pausedRaffle ? String(pausedRaffle.id) : null
}

export function adminRaffleScopeSearchParam(
  routeRaffleId: string | undefined,
  filtersRaffleId: string | null,
  defaultRaffleId: string | null,
): string {
  if (routeRaffleId === "all") return "all"
  return filtersRaffleId ?? defaultRaffleId ?? "all"
}
