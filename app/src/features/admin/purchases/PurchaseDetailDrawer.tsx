import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { PurchaseTicketManager } from "@/features/admin/PurchaseTicketManager"
import { PurchaseEmailsSection } from "@/features/admin/emails/PurchaseEmailsSection"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { PaymentProofPreview } from "@/features/admin/purchases/PaymentProofPreview"
import { PurchaseCustomerFacts } from "@/features/admin/purchases/PurchaseCustomerFacts"
import { PurchaseDrawerActions } from "@/features/admin/purchases/PurchaseDrawerActions"
import { RejectPurchaseDialog } from "@/features/admin/purchases/RejectPurchaseDialog"
import { PurchaseStatusBadge } from "@/features/admin/purchases/PurchaseStatusBadge"
import {
  mapPurchaseDetailApiToDetail,
  type PurchaseDetailApi,
} from "@/features/admin/purchases/purchase-detail-api"
import { PurchaseTicketsPanel } from "@/features/admin/purchases/PurchaseTicketsPanel"
import type { PurchaseDetail, PurchaseRow } from "@/features/admin/purchases/types"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrencyForMethod } from "@/lib/format"
import { cn } from "@/lib/utils"

const DRAWER_WIDTH_CLASS = "!w-full !max-w-full sm:!w-[min(96vw,72rem)] sm:!max-w-[min(96vw,72rem)]"

function mapRowToDetail(row: PurchaseRow): PurchaseDetail {
  return { ...row }
}

type PurchaseDetailDrawerProps = {
  purchaseId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  fallbackPurchase?: PurchaseRow
  onPurchaseUpdated?: (patch: Partial<PurchaseDetail>) => void
}

function PaymentMeta({ purchase }: { purchase: PurchaseDetail }) {
  return (
    <div className="mb-2 shrink-0 border-b pb-2 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-xs">Total</span>
        <span className="text-lg font-bold tabular-nums">
          {formatCurrencyForMethod(purchase.total_amount, purchase.payment_method)}
        </span>
      </div>
      <div className="grid grid-cols-[88px_1fr] gap-x-2 text-sm">
        <span className="text-muted-foreground text-xs">Método</span>
        <span className="font-medium capitalize">{purchase.payment_method.replace(/_/g, " ")}</span>
        <span className="text-muted-foreground text-xs">Referencia</span>
        <span className="font-mono text-xs break-all">
          {purchase.payment_reference?.trim() || "—"}
        </span>
      </div>
      {!purchase.payment_proof_url && (
        <p className="pt-1 text-xs text-amber-600 dark:text-amber-400">Sin comprobante adjunto</p>
      )}
    </div>
  )
}

export function PurchaseDetailDrawer({
  purchaseId,
  open,
  onOpenChange,
  fallbackPurchase,
  onPurchaseUpdated,
}: PurchaseDetailDrawerProps) {
  const queryClient = useQueryClient()
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [localPatch, setLocalPatch] = useState<Partial<PurchaseDetail>>({})

  const handlePurchaseUpdated = (patch: Partial<PurchaseDetail>) => {
    setLocalPatch((prev) => ({ ...prev, ...patch }))
    onPurchaseUpdated?.(patch)
  }

  const detailQuery = useQuery({
    queryKey: ["admin", "purchase", purchaseId],
    queryFn: () => adminFetch<PurchaseDetailApi>(`/api/admin/purchases/${purchaseId}`),
    enabled: open && purchaseId != null,
  })

  const purchase: PurchaseDetail | null =
    detailQuery.data != null
      ? { ...mapPurchaseDetailApiToDetail(detailQuery.data), ...localPatch }
      : fallbackPurchase != null
        ? { ...mapRowToDetail(fallbackPurchase), ...localPatch }
        : null

  const showFooterActions =
    purchase?.status === "pending" || purchase?.status === "approved"

  const statusMutation = useMutation({
    mutationFn: async (payload: { status: "approved" | "rejected"; notes?: string }) => {
      if (!purchaseId) throw new Error("Sin compra")
      const body: { status: string; notes?: string } = { status: payload.status }
      if (payload.notes) body.notes = payload.notes
      return adminFetch(`/api/admin/purchases/${purchaseId}/status`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    },
    onSuccess: (_data, payload) => {
      toast.success(payload.status === "approved" ? "Compra aprobada" : "Compra rechazada")
      void queryClient.invalidateQueries({ queryKey: ["admin"] })
      setConfirmApprove(false)
      setRejectOpen(false)
      if (payload.status === "approved") {
        setLocalPatch({})
        onOpenChange(false)
      } else {
        setLocalPatch((prev) => ({
          ...prev,
          status: "rejected",
          notes: payload.notes ?? prev.notes,
        }))
        void detailQuery.refetch()
      }
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setConfirmApprove(false)
      setRejectOpen(false)
      setLocalPatch({})
    }
    onOpenChange(next)
  }

  const loading = detailQuery.isLoading && !purchase

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className={cn("flex h-full flex-col gap-0 p-0", DRAWER_WIDTH_CLASS)}
      >
        {loading ? (
          <div className="p-4">
            <Skeleton className="mb-3 h-6 w-32" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : purchase ? (
          <>
            <SheetHeader className="shrink-0 border-b px-4 py-2.5">
              <div className="flex items-center justify-between gap-2 pr-8">
                <SheetTitle className="text-base">Compra #{purchase.id}</SheetTitle>
                <PurchaseStatusBadge status={purchase.status} />
              </div>
              <SheetDescription className="sr-only">Detalle de compra</SheetDescription>
            </SheetHeader>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="flex min-h-0 flex-col gap-2 overflow-y-auto border-b p-2.5 lg:border-b-0 lg:border-r lg:p-3">
                <PurchaseCustomerFacts purchase={purchase} className="text-sm" />
                <PurchaseEmailsSection purchase={purchase} />
                <section className="rounded-lg border p-2">
                  <PurchaseTicketsPanel
                    ticketNumbers={purchase.ticketNumbers}
                    ticketNumbersCsv={purchase.ticket_numbers}
                    embedded
                  />
                  <PurchaseTicketManager
                    purchase={purchase}
                    stockLoaded={detailQuery.isSuccess}
                    onUpdated={handlePurchaseUpdated}
                    embedded
                  />
                </section>
              </div>

              <div className="flex min-h-0 flex-col overflow-hidden p-2.5 lg:p-3">
                <p className="text-muted-foreground mb-1 shrink-0 text-xs font-medium uppercase">
                  Pago
                </p>
                <PaymentMeta purchase={purchase} />
                {purchase.payment_proof_url ? (
                  <PaymentProofPreview
                    url={purchase.payment_proof_url}
                    className="min-h-[min(72vh,520px)] flex-1"
                  />
                ) : null}
              </div>
            </div>

            {showFooterActions && (
              <SheetFooter className="shrink-0 border-t p-0">
                <PurchaseDrawerActions
                  status={purchase.status}
                  disabled={statusMutation.isPending}
                  className="w-full"
                  onApprove={
                    purchase.status === "pending"
                      ? () => setConfirmApprove(true)
                      : undefined
                  }
                  onReject={() => setRejectOpen(true)}
                />
              </SheetFooter>
            )}

            <ConfirmAction
              open={confirmApprove}
              onOpenChange={setConfirmApprove}
              title="Aprobar compra"
              description={`¿Confirmas la compra #${purchase.id}?`}
              confirmLabel="Aprobar"
              pending={statusMutation.isPending}
              onConfirm={() => statusMutation.mutate({ status: "approved" })}
            />

            <RejectPurchaseDialog
              open={rejectOpen}
              onOpenChange={setRejectOpen}
              purchaseId={purchase.id}
              customerName={purchase.customer_name}
              pending={purchase.status === "pending"}
              isPending={statusMutation.isPending}
              onConfirm={(notes) => statusMutation.mutate({ status: "rejected", notes })}
            />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
