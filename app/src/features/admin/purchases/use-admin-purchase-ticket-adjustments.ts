import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  formatAdminTicketOperationConfirm,
  formatAdminTicketOperationHelp,
  getDefaultAdminTicketOperationDraft,
  resolveAdminTicketOperation,
  validateAdminTicketRemoveQuantity,
} from "@/features/admin/purchases/admin-ticket-quantity-utils"
import {
  pickPurchaseDetailPatch,
  type PurchaseDetailApi,
} from "@/features/admin/purchases/purchase-detail-api"
import type { PurchaseDetail } from "@/features/admin/purchases/types"
import { invalidateAdminRaffleCaches } from "@/features/admin/raffles/admin-raffle-cache"
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

type TicketOperation = "add" | "remove"

type UseAdminPurchaseTicketAdjustmentsOptions = {
  purchase: PurchaseDetail
  stockLoaded: boolean
  onUpdated: (patch: Partial<PurchaseDetail>) => void
}

export function useAdminPurchaseTicketAdjustments({
  purchase,
  onUpdated,
}: UseAdminPurchaseTicketAdjustmentsOptions) {
  const queryClient = useQueryClient()
  const [operationDraft, setOperationDraft] = useState(getDefaultAdminTicketOperationDraft())
  const [confirm, setConfirm] = useState<"add" | "remove" | "reassign" | null>(null)

  const currentQty = purchase.ticket_quantity

  const resolution = useMemo(
    () => resolveAdminTicketOperation(operationDraft),
    [operationDraft],
  )

  const removeValidation = useMemo(() => {
    if (resolution?.parsed == null) {
      return { message: null, canRemove: false }
    }
    return validateAdminTicketRemoveQuantity(resolution.parsed, currentQty)
  }, [resolution, currentQty])

  const canSubmitAdd = Boolean(resolution?.canSubmit)
  const canSubmitRemove = Boolean(resolution?.canSubmit && removeValidation.canRemove)
  const validationMessage = resolution?.message ?? removeValidation.message ?? null

  useEffect(() => {
    setOperationDraft(getDefaultAdminTicketOperationDraft())
  }, [purchase.id])

  useEffect(() => {
    if (confirm === "add" && !canSubmitAdd) {
      setConfirm(null)
    }
    if (confirm === "remove" && !canSubmitRemove) {
      setConfirm(null)
    }
  }, [confirm, canSubmitAdd, canSubmitRemove])

  const syncAfterChange = async (message: string) => {
    toast.success(message)
    const data = await adminFetch<PurchaseDetailApi>(`/api/admin/purchases/${purchase.id}`)
    onUpdated(pickPurchaseDetailPatch(data))
    void queryClient.invalidateQueries({ queryKey: ["admin"] })
    void invalidateAdminRaffleCaches(queryClient, purchase.raffle_id)
    setConfirm(null)
    setOperationDraft(getDefaultAdminTicketOperationDraft())
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

  const totalAmount = Number(purchase.total_amount)
  const unitPrice =
    currentQty > 0 && Number.isFinite(totalAmount) ? totalAmount / currentQty : null

  const operationQuantity = resolution?.parsed ?? null

  const estimatedTotalFor = (operation: TicketOperation) => {
    if (operationQuantity == null || unitPrice == null) return null
    const newQty =
      operation === "add" ? currentQty + operationQuantity : currentQty - operationQuantity
    if (newQty < 1) return null
    return formatCurrencyForMethod(unitPrice * newQty, purchase.payment_method)
  }

  const helpTextFor = (operation: TicketOperation) => {
    if (operationQuantity == null) return `Actual: ${currentQty} boleto(s)`
    return formatAdminTicketOperationHelp(
      operation,
      operationQuantity,
      currentQty,
      estimatedTotalFor(operation),
    )
  }

  const confirmDescriptionFor = (operation: TicketOperation) => {
    if (operationQuantity == null) return ""
    return formatAdminTicketOperationConfirm(
      operation,
      operationQuantity,
      currentQty,
      estimatedTotalFor(operation),
    )
  }

  const commitDraft = () => {
    if (!resolution || resolution.parsed == null) {
      setOperationDraft(getDefaultAdminTicketOperationDraft())
      return
    }
    if (resolution.message != null) return
    setOperationDraft(String(resolution.parsed))
  }

  const stepOperation = (step: -1 | 1) => {
    if (!resolution || resolution.parsed == null || resolution.message != null) return
    const next = resolution.parsed + step
    if (next < 1) return
    setOperationDraft(String(next))
  }

  const submitOperation = (operation: TicketOperation) => {
    if (operationQuantity == null) return
    if (operation === "add" && !canSubmitAdd) return
    if (operation === "remove" && !canSubmitRemove) return
    const delta = operation === "add" ? operationQuantity : -operationQuantity
    adjustMutation.mutate(delta)
  }

  return {
    operationDraft,
    setOperationDraft,
    confirm,
    setConfirm,
    resolution,
    pending,
    canAdjust,
    canReassign,
    canSubmitAdd,
    canSubmitRemove,
    validationMessage,
    helpTextFor,
    confirmDescriptionFor,
    commitDraft,
    stepOperation,
    submitOperation,
    adjustMutation,
    reassignMutation,
    currentQty,
    operationQuantity,
  }
}
