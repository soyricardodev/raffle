import type { UpdateRaffleInput } from "@raffle/shared/validators"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminRaffleMissing } from "@/features/admin/raffles/AdminRaffleMissing"
import {
  type AdminRaffleDetail,
  useAdminRaffleDetailQuery,
} from "@/features/admin/raffles/admin-raffle-detail-queries"
import { RaffleForm } from "@/features/admin/raffles/RaffleForm"
import type { PaymentMethodAssignment, RaffleFormState } from "@/features/admin/raffles/types"
import { defaultPrize, defaultRaffleFormState } from "@/features/admin/raffles/types"
import { adminFetch } from "@/lib/admin-fetch"

function mapDetailToForm(detail: AdminRaffleDetail): RaffleFormState {
  const base = defaultRaffleFormState()
  return {
    ...base,
    name: detail.name,
    description: detail.description ?? "",
    imageUrl: detail.image_url,
    priceBs: String(detail.price_bs),
    priceUsd: String(detail.price_usd),
    minPurchase: String(detail.min_purchase),
    maxPurchase: String(detail.max_purchase),
    drawDateEnabled: Boolean(detail.draw_date),
    drawDate: detail.draw_date ? new Date(detail.draw_date).toISOString().slice(0, 16) : "",
    status: detail.status as RaffleFormState["status"],
    prizes: detail.prizes?.length
      ? detail.prizes.map((p) => ({
          name: p.name,
          description: p.description ?? "",
          position: p.position,
          image_url: p.image_url ?? null,
        }))
      : [defaultPrize()],
    assignments:
      detail.payment_methods?.map(
        (m): PaymentMethodAssignment => ({
          account_id: m.account_id,
          min_tickets: m.min_tickets != null ? String(m.min_tickets) : "",
          is_active: m.is_active !== false,
        }),
      ) ?? [],
  }
}

export function EditRaffleForm({ raffleId }: { raffleId: string }) {
  const navigate = useNavigate()
  const raffleQuery = useAdminRaffleDetailQuery(raffleId)

  const initial = useMemo(
    () => (raffleQuery.data ? mapDetailToForm(raffleQuery.data) : defaultRaffleFormState()),
    [raffleQuery.data],
  )

  const saveMutation = useMutation({
    mutationFn: async (payload: UpdateRaffleInput) =>
      adminFetch(`/api/admin/raffles/${raffleId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Rifa actualizada")
      void navigate({ to: "/admin/rifas/$id", params: { id: raffleId } })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (raffleQuery.isPending) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (raffleQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="text-lg font-medium">No se pudo cargar la rifa</p>
        <p className="text-muted-foreground max-w-sm text-sm">{raffleQuery.error.message}</p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => void raffleQuery.refetch()}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  if (raffleQuery.data == null) {
    return <AdminRaffleMissing raffleId={raffleId} />
  }

  return (
    <RaffleForm
      key={raffleId + String(raffleQuery.dataUpdatedAt)}
      mode="edit"
      title="Editar rifa"
      description={`Rifa #${raffleId}`}
      raffleId={raffleId}
      initial={initial}
      isPending={saveMutation.isPending}
      onSubmit={(payload) => saveMutation.mutate(payload as UpdateRaffleInput)}
      onCancel={() => void navigate({ to: "/admin/rifas/$id", params: { id: raffleId } })}
    />
  )
}
