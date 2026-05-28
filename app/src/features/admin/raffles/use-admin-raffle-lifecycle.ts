import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { TransitionRaffleInput } from "@raffle/shared/validators"
import { toast } from "sonner"
import {
  adminRaffleDetailQueryOptions,
  adminRaffleQueryKeys,
} from "@/features/admin/raffles/admin-raffle-detail-queries"
import { adminFetch } from "@/lib/admin-fetch"

export async function executeRaffleLifecycle(
  raffleId: string | number,
  request: TransitionRaffleInput,
) {
  return adminFetch(`/api/admin/raffles/${String(raffleId)}/lifecycle`, {
    method: "POST",
    body: JSON.stringify(request),
  })
}

export function useAdminRaffleLifecycle(raffleId?: string) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    if (raffleId) {
      void queryClient.invalidateQueries({
        queryKey: adminRaffleDetailQueryOptions(raffleId).queryKey,
      })
    }
    void queryClient.invalidateQueries({ queryKey: ["admin", "raffles"] })
  }

  const mutation = useMutation({
    mutationFn: async ({
      id,
      request,
    }: {
      id: number
      request: TransitionRaffleInput
    }) => executeRaffleLifecycle(id, request),
    onSuccess: (_data, variables) => {
      toast.success("Rifa actualizada")
      if (raffleId && variables.id === Number(raffleId)) {
        void queryClient.invalidateQueries({
          queryKey: adminRaffleQueryKeys.detail(raffleId),
        })
      }
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return {
    run: (request: TransitionRaffleInput) => {
      if (raffleId == null) {
        throw new Error("raffleId is required for run()")
      }
      mutation.mutate({ id: Number(raffleId), request })
    },
    runForRaffle: (id: number, request: TransitionRaffleInput) =>
      mutation.mutate({ id, request }),
    pending: mutation.isPending,
  }
}
