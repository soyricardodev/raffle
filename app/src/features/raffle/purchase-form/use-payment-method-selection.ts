import { useEffect, useState } from "react"
import { getMethodEligibility } from "@/features/raffle/payment-method-eligibility"
import type { RafflePaymentMethod } from "@/features/raffle/types"

/** Prefer Pago móvil when eligible; otherwise first eligible method. */
export function pickDefaultPaymentMethodId(
  methods: RafflePaymentMethod[],
  quantity: number,
): number | null {
  const eligible = methods.filter((m) => getMethodEligibility(m, quantity).canSelect)
  if (eligible.length === 0) return null

  const pagoMovil = eligible.find((m) => m.method_type === "pago_movil")
  return (pagoMovil ?? eligible[0])!.id
}

export function usePaymentMethodSelection(
  methods: RafflePaymentMethod[],
  quantity: number,
) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const selectedMethod = methods.find((m) => m.id === selectedId) ?? null

  useEffect(() => {
    if (selectedId != null) return
    const defaultId = pickDefaultPaymentMethodId(methods, quantity)
    if (defaultId != null) setSelectedId(defaultId)
  }, [methods, selectedId, quantity])

  useEffect(() => {
    if (!selectedId) return
    const method = methods.find((m) => m.id === selectedId)
    if (!method) {
      setSelectedId(null)
      return
    }
    if (!getMethodEligibility(method, quantity).canSelect) {
      setSelectedId(null)
    }
  }, [quantity, selectedId, methods])

  const selectedBlockedReason = selectedMethod
    ? getMethodEligibility(selectedMethod, quantity).blockedReason
    : undefined

  return {
    selectedId,
    setSelectedId,
    selectedMethod,
    selectedBlockedReason,
    getEligibility: (method: RafflePaymentMethod) => getMethodEligibility(method, quantity),
  }
}
