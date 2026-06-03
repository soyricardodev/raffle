import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { callRaffleIdServerFn, RaffleIdInput } from "@/features/raffle/raffle-server-fn"
import { getRaffleById } from "@/server/raffle.service"

export const raffleQueryKeys = {
  detail: (id: string) => ["raffle", id] as const,
}

export const fetchRaffleById = createServerFn({ method: "POST" })
  .inputValidator(RaffleIdInput)
  .handler(async ({ data }) => {
    return getRaffleById(Number(data.id))
  })

const RAFFLE_DETAIL_STALE_MS = 120_000

export function raffleDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: raffleQueryKeys.detail(id),
    queryFn: () => callRaffleIdServerFn(fetchRaffleById, id),
    staleTime: RAFFLE_DETAIL_STALE_MS,
  })
}
