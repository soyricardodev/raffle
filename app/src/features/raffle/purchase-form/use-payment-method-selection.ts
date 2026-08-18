import { useCallback, useEffect, useMemo, useState } from "react"
import { getMethodEligibility } from "@/features/raffle/payment-method-eligibility"
import type { RafflePaymentMethod } from "@/features/raffle/types"

/** First eligible method in catalog order. Pago móvil is first by default. */
export function pickDefaultPaymentMethodId(
  methods: RafflePaymentMethod[],
  quantity: number,
  available?: number,
): number | null {
  const eligible = methods.filter((m) => getMethodEligibility(m, quantity, available).canSelect)
  return eligible[0]?.id ?? null
}

export function usePaymentMethodSelection(
  methods: RafflePaymentMethod[],
  quantity: number,
  available?: number,
) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === selectedId) ?? null,
    [methods, selectedId],
  )

  useEffect(() => {
    if (selectedId != null) return
    const defaultId = pickDefaultPaymentMethodId(methods, quantity, available)
    if (defaultId != null) setSelectedId(defaultId)
  }, [methods, selectedId, quantity, available])

  useEffect(() => {
    if (!selectedId) return
    const method = methods.find((m) => m.id === selectedId)
    if (!method) {
      setSelectedId(null)
      return
    }
    if (!getMethodEligibility(method, quantity, available).canSelect) {
      setSelectedId(null)
    }
  }, [quantity, selectedId, methods, available])

  const selectedBlockedReason = useMemo(
    () =>
      selectedMethod
        ? getMethodEligibility(selectedMethod, quantity, available).blockedReason
        : undefined,
    [selectedMethod, quantity, available],
  )

  const getEligibility = useCallback(
    (method: RafflePaymentMethod) => getMethodEligibility(method, quantity, available),
    [quantity, available],
  )

  return {
    selectedId,
    setSelectedId,
    selectedMethod,
    selectedBlockedReason,
    getEligibility,
  }
}
