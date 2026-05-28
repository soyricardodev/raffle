import { useMutation, useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import type { UpdateRaffleInput } from "@raffle/shared/validators"
import { RaffleForm } from "@/features/admin/raffles/RaffleForm"
import type { RaffleFormState } from "@/features/admin/raffles/types"
import { defaultPrize, defaultRaffleFormState } from "@/features/admin/raffles/types"
import {
  defaultPaymentMethod,
  type PaymentMethodDraft,
} from "@/features/admin/PaymentMethodsEditor"
import { adminFetch } from "@/lib/admin-fetch"
import { Skeleton } from "@/components/ui/skeleton"

type RaffleDetail = {
  id: number
  name: string
  description: string | null
  image_url: string | null
  price_bs: string | number
  price_usd: string | number
  min_purchase: number
  max_purchase: number
  draw_date: string | null
  status: RaffleFormState["status"]
  prizes?: Array<{
    name: string
    description: string | null
    position: number
    image_url?: string | null
  }>
  payment_methods?: Array<{
    method_type: string
    account_info: string | Record<string, string>
    min_tickets?: number | null
    is_active?: boolean
  }>
}

function parseAccountInfo(info: string | Record<string, string>): Record<string, string> {
  if (typeof info === "string") {
    try {
      return JSON.parse(info) as Record<string, string>
    } catch {
      return {}
    }
  }
  return info
}

function mapDetailToForm(detail: RaffleDetail): RaffleFormState {
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
    drawDate: detail.draw_date
      ? new Date(detail.draw_date).toISOString().slice(0, 16)
      : "",
    status: detail.status,
    prizes: detail.prizes?.length
      ? detail.prizes.map((p) => ({
          name: p.name,
          description: p.description ?? "",
          position: p.position,
          image_url: p.image_url ?? null,
        }))
      : [defaultPrize()],
    methods: detail.payment_methods?.length
      ? detail.payment_methods.map(
          (m): PaymentMethodDraft => ({
            method_type: m.method_type,
            account_info: parseAccountInfo(m.account_info),
            min_tickets: m.min_tickets != null ? String(m.min_tickets) : "",
          }),
        )
      : [defaultPaymentMethod()],
  }
}

export function EditRaffleForm({ raffleId }: { raffleId: string }) {
  const navigate = useNavigate()

  const raffleQuery = useQuery({
    queryKey: ["admin", "raffle", raffleId],
    queryFn: () => adminFetch<RaffleDetail>(`/api/admin/raffles/${raffleId}`),
  })

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

  if (raffleQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!raffleQuery.data) {
    return <p className="text-muted-foreground p-8 text-center">No se encontró la rifa.</p>
  }

  return (
    <RaffleForm
      key={raffleId + String(raffleQuery.dataUpdatedAt)}
      mode="edit"
      title="Editar rifa"
      description={`Rifa #${raffleId}`}
      initial={initial}
      isPending={saveMutation.isPending}
      onSubmit={(payload) => saveMutation.mutate(payload as UpdateRaffleInput)}
      onCancel={() => void navigate({ to: "/admin/rifas/$id", params: { id: raffleId } })}
    />
  )
}
