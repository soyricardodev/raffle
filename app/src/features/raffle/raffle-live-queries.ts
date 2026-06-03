import { queryOptions, useQuery } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRaffleLiveSnapshot, type RaffleLiveSnapshot } from "@/server/pause.service"
import {
  callRaffleIdServerFn,
  RaffleIdInput,
} from "@/features/raffle/raffle-server-fn"

export type RaffleLiveStatus = RaffleLiveSnapshot

export const raffleLiveQueryKeys = {
  status: (raffleId: string) => ["raffle", raffleId, "live"] as const,
}

export const fetchRaffleLiveStatus = createServerFn({ method: "POST" })
  .inputValidator(RaffleIdInput)
  .handler(async ({ data }) => getRaffleLiveSnapshot(Number(data.id)))

/** Light poll: narrow SELECT on counters + pause (no prizes, payment methods, images). */
export function raffleLiveQueryOptions(raffleId: string) {
  return queryOptions({
    queryKey: raffleLiveQueryKeys.status(raffleId),
    queryFn: () => callRaffleIdServerFn(fetchRaffleLiveStatus, raffleId),
    staleTime: 5_000,
  })
}

const LIVE_POLL_MS = 5_000

function livePollIntervalMs(data: RaffleLiveStatus | null | undefined): number | false {
  if (typeof document !== "undefined" && document.hidden) return false
  if (!data) return LIVE_POLL_MS
  if (data.status === "finished" || data.availability.isFull) return false
  return LIVE_POLL_MS
}

export function useRaffleLiveStatus(
  raffleId: string | number,
  options?: { enabled?: boolean },
) {
  const id = String(raffleId)
  return useQuery({
    ...raffleLiveQueryOptions(id),
    enabled: options?.enabled ?? true,
    refetchInterval: (query) => livePollIntervalMs(query.state.data),
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  })
}
