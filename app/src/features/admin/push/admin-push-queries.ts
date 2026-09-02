import { queryOptions } from "@tanstack/react-query"
import { adminFetch } from "@/lib/admin-fetch"

export type AdminPushSubscriber = {
  id: number
  device: string
  createdAt: string
  lastSeenAt: string
}

export type AdminPushListResponse = {
  enabled: boolean
  count: number
  subscribers: AdminPushSubscriber[]
}

export type AdminPushSendResult = {
  sent: number
  removed: number
  total: number
}

export const adminPushQueryKeys = {
  list: ["admin", "push"] as const,
}

export function adminPushQueryOptions() {
  return queryOptions({
    queryKey: adminPushQueryKeys.list,
    queryFn: () => adminFetch<AdminPushListResponse>("/api/admin/push"),
    staleTime: 15_000,
  })
}
