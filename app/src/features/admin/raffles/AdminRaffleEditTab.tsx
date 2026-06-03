import type { UpdateRaffleInput } from "@raffle/shared/validators"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { toast } from "sonner"
import type { AdminRaffleDetail } from "@/features/admin/raffles/admin-raffle-detail-queries"
import { invalidateAdminRaffleCaches } from "@/features/admin/raffles/admin-raffle-cache"
import { mapDetailToForm } from "@/features/admin/raffles/map-detail-to-form"
import { RaffleForm } from "@/features/admin/raffles/RaffleForm"
import { adminFetch } from "@/lib/admin-fetch"

type AdminRaffleEditTabProps = {
  raffleId: string
  detail: AdminRaffleDetail
  formKey: string
  onDone: () => void
}

export function AdminRaffleEditTab({ raffleId, detail, formKey, onDone }: AdminRaffleEditTabProps) {
  const queryClient = useQueryClient()
  const initial = useMemo(() => mapDetailToForm(detail), [detail])

  const saveMutation = useMutation({
    mutationFn: async (payload: UpdateRaffleInput) =>
      adminFetch(`/api/admin/raffles/${raffleId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      toast.success("Rifa actualizada")
      await invalidateAdminRaffleCaches(queryClient, raffleId)
      onDone()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <RaffleForm
      key={formKey}
      mode="edit"
      raffleId={raffleId}
      initial={initial}
      isPending={saveMutation.isPending}
      onSubmit={(payload) => saveMutation.mutate(payload)}
      onCancel={onDone}
    />
  )
}
