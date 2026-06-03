import { RaffleNotFoundError } from "@raffle/shared/errors"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { requireAdminMiddleware } from "@/features/admin/shared/admin-auth-middleware"
import { type EnrichedRaffle, getRaffleById } from "@/server/raffle.service"

const AdminRaffleIdInput = z.object({
  id: z.string().min(1),
})

export type AdminRaffleDetail = EnrichedRaffle

export const adminRaffleQueryKeys = {
  detail: (id: string) => ["admin", "raffle", id] as const,
}

function parseRaffleId(raw: string): number | null {
  const id = Number(raw)
  if (!Number.isFinite(id) || id < 1) return null
  return id
}

export const fetchAdminRaffleById = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .inputValidator(AdminRaffleIdInput)
  .handler(async ({ data }): Promise<AdminRaffleDetail | null> => {
    const id = parseRaffleId(data.id)
    if (id == null) return null

    try {
      return await getRaffleById(id, {
        includeInactivePaymentMethods: true,
      })
    } catch (error) {
      if (error instanceof RaffleNotFoundError) return null
      throw error
    }
  })

export function adminRaffleDetailQueryOptions(raffleId: string) {
  return queryOptions({
    queryKey: adminRaffleQueryKeys.detail(raffleId),
    queryFn: () => fetchAdminRaffleById({ data: { id: raffleId } }),
    staleTime: 30_000,
    retry: false,
  })
}

export function useAdminRaffleDetailQuery(raffleId: string) {
  return useQuery(adminRaffleDetailQueryOptions(raffleId))
}
