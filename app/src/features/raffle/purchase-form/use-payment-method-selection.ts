import { useEffect, useState } from "react"
import { getMethodEligibility } from "@/features/raffle/payment-method-eligibility"
import type { RafflePaymentMethod } from "@/features/raffle/types"

export function usePaymentMethodSelection(
  methods: RafflePaymentMethod[],
  quantity: number,
) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const selectedMethod = methods.find((m) => m.id === selectedId) ?? null

  useEffect(() => {
    if (methods.length !== 1 || selectedId != null) return
    const only = methods[0]
    if (!only) return
    if (getMethodEligibility(only, quantity).canSelect) {
      setSelectedId(only.id)
    }
  }, [methods, selectedId, quantity])

  useEffect(() => {
    if (!selectedId) return
    const method = methods.find((m) => m.id === selectedId)
    if (!method) return
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
