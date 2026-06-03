import { RaffleStatus } from "@raffle/shared/validators"
import type { AdminRaffleDetail } from "@/features/admin/raffles/admin-raffle-detail-queries"
import type { PaymentMethodAssignment, RaffleFormState } from "@/features/admin/raffles/types"
import { defaultPrize, defaultRaffleFormState } from "@/features/admin/raffles/types"
import { isoToDatetimeLocal } from "@/lib/date-input"

export function mapDetailToForm(detail: AdminRaffleDetail): RaffleFormState {
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
    drawDate: detail.draw_date ? isoToDatetimeLocal(detail.draw_date) : "",
    status: RaffleStatus.parse(detail.status),
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
