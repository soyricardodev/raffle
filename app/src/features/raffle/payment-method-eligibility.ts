import { isPaymentMethodMinWaived } from "@raffle/shared/purchase/quantity-policy"
import type { RafflePaymentMethod } from "@/features/raffle/types"

export type MethodEligibility = {
  minTickets: number
  locked: boolean
  canSelect: boolean
  blockedReason?: string
}

export function getMethodEligibility(
  method: Pick<RafflePaymentMethod, "min_tickets">,
  quantity: number,
  available?: number,
): MethodEligibility {
  const minTickets = method.min_tickets ?? 0
  const waived =
    available != null && isPaymentMethodMinWaived(available, method.min_tickets)
  const locked = minTickets > 0 && quantity < minTickets && !waived
  return {
    minTickets,
    locked,
    canSelect: !locked,
    blockedReason: locked
      ? `Disponible desde ${minTickets} boletos (tienes ${quantity} seleccionados)`
      : undefined,
  }
}
