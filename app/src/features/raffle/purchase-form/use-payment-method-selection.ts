import { useCallback, useEffect, useMemo, useState } from "react"
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
  const fallback = eligible[0]
  if (!fallback) return null
  return (pagoMovil ?? fallback).id
}

export function usePaymentMethodSelection(methods: RafflePaymentMethod[], quantity: number) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === selectedId) ?? null,
    [methods, selectedId],
  )

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

  const selectedBlockedReason = useMemo(
    () =>
      selectedMethod ? getMethodEligibility(selectedMethod, quantity).blockedReason : undefined,
    [selectedMethod, quantity],
  )

  const getEligibility = useCallback(
    (method: RafflePaymentMethod) => getMethodEligibility(method, quantity),
    [quantity],
  )

  return {
    selectedId,
    setSelectedId,
    selectedMethod,
    selectedBlockedReason,
    getEligibility,
  }
}
