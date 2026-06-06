import type { AdminUserPreferences } from "@raffle/shared/admin/user-preferences"
import { queryOptions } from "@tanstack/react-query"
import { adminFetch } from "@/lib/admin-fetch"

export const adminUserPreferencesQueryKey = ["admin", "me", "preferences"] as const

export function adminUserPreferencesQueryOptions() {
  return queryOptions({
    queryKey: adminUserPreferencesQueryKey,
    queryFn: () => adminFetch<AdminUserPreferences>("/api/admin/me/preferences"),
    staleTime: 60_000,
  })
}
