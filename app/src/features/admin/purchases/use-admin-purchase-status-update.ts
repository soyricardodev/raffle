import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { patchAdminPurchaseStatusInCache } from "@/features/admin/purchases/patch-admin-purchases-cache"
import { invalidateAdminRaffleCaches } from "@/features/admin/raffles/admin-raffle-cache"
import { adminFetch } from "@/lib/admin-fetch"

export type AdminPurchaseStatusPayload = {
  purchaseId: number
  status: "approved" | "rejected"
  notes?: string
}

type AdminPurchaseStatusResponse = {
  raffleId: number
}

type UseAdminPurchaseStatusUpdateOptions = {
  onSuccess?: (payload: AdminPurchaseStatusPayload) => void
}

export function useAdminPurchaseStatusUpdate(options?: UseAdminPurchaseStatusUpdateOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ purchaseId, status, notes }: AdminPurchaseStatusPayload) => {
      const body: { status: string; notes?: string } = { status }
      if (notes) body.notes = notes
      return adminFetch<AdminPurchaseStatusResponse>(`/api/admin/purchases/${purchaseId}/status`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    },
    onSuccess: (data, variables) => {
      patchAdminPurchaseStatusInCache(
        queryClient,
        variables.purchaseId,
        variables.status,
        variables.notes,
      )
      void invalidateAdminRaffleCaches(queryClient, data.raffleId)
      options?.onSuccess?.(variables)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
