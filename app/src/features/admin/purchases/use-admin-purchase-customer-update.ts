import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  pickPurchaseDetailPatch,
  type PurchaseDetailApi,
} from "@/features/admin/purchases/purchase-detail-api"
import type { EditPurchaseCustomerPayload } from "@/features/admin/purchases/EditPurchaseCustomerSheet"
import type { PurchaseDetail } from "@/features/admin/purchases/types"
import { adminFetch } from "@/lib/admin-fetch"

type UseAdminPurchaseCustomerUpdateOptions = {
  purchaseId: number | null
  onUpdated: (patch: Partial<PurchaseDetail>) => void
}

export function useAdminPurchaseCustomerUpdate({
  purchaseId,
  onUpdated,
}: UseAdminPurchaseCustomerUpdateOptions) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (payload: EditPurchaseCustomerPayload) => {
      if (purchaseId == null) throw new Error("Sin compra")
      return adminFetch<PurchaseDetailApi>(`/api/admin/purchases/${purchaseId}/customer`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: async (data) => {
      onUpdated(pickPurchaseDetailPatch(data))
      void queryClient.invalidateQueries({ queryKey: ["admin"] })
      toast.success("Datos del comprador actualizados")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return mutation
}
