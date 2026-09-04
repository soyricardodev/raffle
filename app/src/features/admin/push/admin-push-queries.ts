import type { PushAutoAlert, RafflePushPlanItem } from "@raffle/shared/push"
import { queryOptions } from "@tanstack/react-query"
import { adminFetch } from "@/lib/admin-fetch"

export type AdminPushSubscriber = {
  id: number
  device: string
  displayName: string | null
  createdAt: string
  lastSeenAt: string
}

export type AdminPushPlanRaffle = {
  id: number
  name: string
  status: string
  ticketsSold: number
  totalTickets: number
  soldPercent: number
}

export type AdminPushPlanItem = RafflePushPlanItem

export type AdminPushPlan = {
  raffle: AdminPushPlanRaffle | null
  milestones: AdminPushPlanItem[]
  promotions: AdminPushPlanItem[]
}

export type AdminPushAutoAlert = PushAutoAlert

export type AdminPushListResponse = {
  enabled: boolean
  count: number
  subscribers: AdminPushSubscriber[]
  plan: AdminPushPlan
  autoAlerts: AdminPushAutoAlert[]
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
