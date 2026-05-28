import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { adminRaffleDetailQueryOptions } from "@/features/admin/raffles/admin-raffle-detail-queries"
import type { LifecycleConfirm } from "@/features/admin/raffles/raffle-lifecycle-ui"
import { adminFetch } from "@/lib/admin-fetch"

export async function executeRaffleLifecycle(
  raffleId: string | number,
  confirm: LifecycleConfirm,
) {
  const id = String(raffleId)
  if (confirm === "pause") {
    return adminFetch(`/api/admin/raffles/${id}/pause`, { method: "POST" })
  }
  if (confirm === "unpause") {
    return adminFetch(`/api/admin/raffles/${id}/unpause`, { method: "POST" })
  }
  if (confirm === "publish") {
    return adminFetch(`/api/admin/raffles/${id}/publish`, {
      method: "PUT",
      body: JSON.stringify({ publish: true }),
    })
  }
  if (confirm === "finish") {
    return adminFetch(`/api/admin/raffles/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "finished" }),
    })
  }
  if (confirm === "activate" || confirm === "reactivate") {
    return adminFetch(`/api/admin/raffles/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "active" }),
    })
  }
  return adminFetch(`/api/admin/raffles/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: confirm.status }),
  })
}

export function useAdminRaffleLifecycle(raffleId: string) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: adminRaffleDetailQueryOptions(raffleId).queryKey,
    })
    void queryClient.invalidateQueries({ queryKey: ["admin", "raffles"] })
  }

  const mutation = useMutation({
    mutationFn: async (confirm: LifecycleConfirm) =>
      executeRaffleLifecycle(raffleId, confirm),
    onSuccess: () => {
      toast.success("Rifa actualizada")
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return { run: mutation.mutate, pending: mutation.isPending }
}
