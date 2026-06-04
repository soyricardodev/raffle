import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  formatAdminStockHint,
  resolveAdminTicketTarget,
} from "@/features/admin/purchases/admin-ticket-quantity-utils"
import {
  pickPurchaseDetailPatch,
  type PurchaseDetailApi,
} from "@/features/admin/purchases/purchase-detail-api"
import type { PurchaseDetail } from "@/features/admin/purchases/types"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrencyForMethod } from "@/lib/format"

type TicketAddResult = {
  addedTickets: Array<string>
  newQuantity: number
  newTotalAmount: number
}

type TicketRemoveResult = {
  removedTickets: Array<string>
  newQuantity: number
  newTotalAmount: number
}

type TicketReassignResult = {
  ticketNumbers: Array<string>
  newQuantity: number
  newTotalAmount: number
}

type UseAdminPurchaseTicketAdjustmentsOptions = {
  purchase: PurchaseDetail
  stockLoaded: boolean
  onUpdated: (patch: Partial<PurchaseDetail>) => void
}

export function useAdminPurchaseTicketAdjustments({
  purchase,
  stockLoaded,
  onUpdated,
}: UseAdminPurchaseTicketAdjustmentsOptions) {
  const queryClient = useQueryClient()
  const [targetDraft, setTargetDraft] = useState(String(purchase.ticket_quantity))
  const [confirm, setConfirm] = useState<"update" | "reassign" | null>(null)

  const currentQty = purchase.ticket_quantity
  const raffleTicketsAvailable = purchase.raffle_tickets_available ?? 0

  const resolution = useMemo(() => {
    if (!stockLoaded) return null
    return resolveAdminTicketTarget(targetDraft, currentQty, raffleTicketsAvailable)
  }, [stockLoaded, targetDraft, currentQty, raffleTicketsAvailable])

  useEffect(() => {
    setTargetDraft(String(currentQty))
  }, [purchase.id, currentQty])

  useEffect(() => {
    if (confirm === "update" && resolution && !resolution.canSubmit) {
      setConfirm(null)
    }
  }, [confirm, resolution])

  const syncAfterChange = async (message: string) => {
    toast.success(message)
    const data = await adminFetch<PurchaseDetailApi>(`/api/admin/purchases/${purchase.id}`)
    onUpdated(pickPurchaseDetailPatch(data))
    void queryClient.invalidateQueries({ queryKey: ["admin"] })
    setConfirm(null)
  }

  const adjustMutation = useMutation({
    mutationFn: async (adjustDelta: number) => {
      if (adjustDelta === 0) {
        throw new Error("Sin cambios en la cantidad de boletos")
      }
      const absDelta = Math.abs(adjustDelta)
      if (adjustDelta > 0) {
        const result = await adminFetch<TicketAddResult>(
          `/api/admin/purchases/${purchase.id}/tickets/add`,
          { method: "PUT", body: JSON.stringify({ quantity: absDelta }) },
        )
        return { kind: "add" as const, result }
      }
      const result = await adminFetch<TicketRemoveResult>(
        `/api/admin/purchases/${purchase.id}/tickets/remove`,
        { method: "PUT", body: JSON.stringify({ quantity: absDelta }) },
      )
      return { kind: "remove" as const, result }
    },
    onSuccess: async (data) => {
      const message =
        data.kind === "add"
          ? `${data.result.addedTickets.length} boleto(s) agregado(s)`
          : `${data.result.removedTickets.length} boleto(s) eliminado(s)`
      await syncAfterChange(message)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const reassignMutation = useMutation({
    mutationFn: () =>
      adminFetch<TicketReassignResult>(`/api/admin/purchases/${purchase.id}/tickets/reassign`, {
        method: "PUT",
      }),
    onSuccess: async () => {
      await syncAfterChange("Boletos reasignados — compra pendiente")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const pending = adjustMutation.isPending || reassignMutation.isPending
  const canAdjust = purchase.status === "approved" || purchase.status === "pending"
  const canReassign = purchase.status === "rejected"

  const formattedCurrentTotal = formatCurrencyForMethod(
    purchase.total_amount,
    purchase.payment_method,
  )
  const totalAmount = Number(purchase.total_amount)
  const unitPrice =
    currentQty > 0 && Number.isFinite(totalAmount) ? totalAmount / currentQty : null

  const target = resolution?.target ?? currentQty
  const delta = resolution?.delta ?? 0
  const hasChange = delta !== 0
  const isDecrease = delta < 0
  const deltaLabel = delta > 0 ? `+${delta}` : String(delta)

  const estimatedTotal =
    unitPrice != null && hasChange
      ? formatCurrencyForMethod(unitPrice * target, purchase.payment_method)
      : null

  const helpText = hasChange
    ? `${deltaLabel} · ~${estimatedTotal ?? formattedCurrentTotal}`
    : `Total ${formattedCurrentTotal}`

  const stockHint = resolution ? formatAdminStockHint(resolution.bounds) : null

  const updateConfirmDescription =
    estimatedTotal != null
      ? `De ${currentQty} a ${target} (${deltaLabel}). Total aprox.: ${estimatedTotal}.${stockHint ? ` ${stockHint}.` : ""}`
      : `De ${currentQty} a ${target} (${deltaLabel}).${stockHint ? ` ${stockHint}.` : ""}`

  const commitDraft = () => {
    if (!resolution || resolution.parsed == null) {
      setTargetDraft(String(currentQty))
      return
    }
    if (resolution.message != null) return
    setTargetDraft(String(resolution.target))
  }

  const stepTarget = (step: -1 | 1) => {
    if (!resolution || resolution.parsed == null || resolution.message != null) return
    setTargetDraft(String(resolution.parsed + step))
  }

  return {
    targetDraft,
    setTargetDraft,
    confirm,
    setConfirm,
    resolution,
    stockLoaded,
    pending,
    canAdjust,
    canReassign,
    canSubmitUpdate: Boolean(resolution?.canSubmit),
    validationMessage: resolution?.message ?? null,
    helpText,
    stockHint,
    updateConfirmDescription,
    commitDraft,
    stepTarget,
    isDecrease,
    adjustMutation,
    reassignMutation,
    currentQty,
    target,
  }
}
