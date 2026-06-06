import { useQuery } from "@tanstack/react-query"
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
import { useAdminUserPreferences } from "@/features/admin/preferences/use-admin-user-preferences"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { requestPurchaseApprove } from "@/features/admin/purchases/purchase-action-guard"
import { PaymentProofPreview } from "@/features/admin/purchases/PaymentProofPreview"
import { EditPurchaseCustomerSheet } from "@/features/admin/purchases/EditPurchaseCustomerSheet"
import { PurchaseDetailSidebar } from "@/features/admin/purchases/PurchaseDetailSidebar"
import { useAdminPurchaseCustomerUpdate } from "@/features/admin/purchases/use-admin-purchase-customer-update"
import { useAdminPurchaseStatusUpdate } from "@/features/admin/purchases/use-admin-purchase-status-update"
import { PurchaseDrawerActions } from "@/features/admin/purchases/PurchaseDrawerActions"
import { RejectPurchaseDialog } from "@/features/admin/purchases/RejectPurchaseDialog"
import { PurchaseStatusBadge } from "@/features/admin/purchases/PurchaseStatusBadge"
import {
  mapPurchaseDetailApiToDetail,
  type PurchaseDetailApi,
} from "@/features/admin/purchases/purchase-detail-api"
import type { PurchaseDetail, PurchaseRow } from "@/features/admin/purchases/types"
import { adminFetch } from "@/lib/admin-fetch"
import { cn } from "@/lib/utils"

const DRAWER_WIDTH_CLASS = "!w-full !max-w-full sm:!w-[min(98vw,80rem)] sm:!max-w-[min(98vw,80rem)]"

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

export function PurchaseDetailDrawer({
  purchaseId,
  open,
  onOpenChange,
  fallbackPurchase,
  onPurchaseUpdated,
}: PurchaseDetailDrawerProps) {
  const { skipApproveConfirm } = useAdminUserPreferences()
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [editContactOpen, setEditContactOpen] = useState(false)
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

  const statusMutation = useAdminPurchaseStatusUpdate({
    onSuccess: (payload) => {
      toast.success(payload.status === "approved" ? "Compra aprobada" : "Compra rechazada")
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
  })

  const customerUpdateMutation = useAdminPurchaseCustomerUpdate({
    purchaseId,
    onUpdated: handlePurchaseUpdated,
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setConfirmApprove(false)
      setRejectOpen(false)
      setEditContactOpen(false)
      setLocalPatch({})
    }
    onOpenChange(next)
  }

  const loading = detailQuery.isLoading && !purchase

  return (
    <>
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,460px)] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_480px]">
              <div className="shrink-0 border-b p-2.5 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-3">
                <PurchaseDetailSidebar
                  purchase={purchase}
                  stockLoaded={detailQuery.isSuccess}
                  onEditContact={() => setEditContactOpen(true)}
                  editContactDisabled={customerUpdateMutation.isPending}
                  onUpdated={handlePurchaseUpdated}
                />
              </div>

              <div className="relative min-h-[min(88vh,1000px)] bg-muted/10 lg:min-h-0 lg:overflow-hidden">
                {purchase.payment_proof_url ? (
                  <PaymentProofPreview
                    url={purchase.payment_proof_url}
                    defaultZoomed
                    fillHeight
                    className="absolute inset-0 h-full"
                  />
                ) : (
                  <div className="text-muted-foreground flex h-full min-h-[40vh] items-center justify-center p-6 text-center text-sm">
                    Sin comprobante adjunto
                  </div>
                )}
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
                      ? () =>
                          requestPurchaseApprove({
                            skipConfirm: skipApproveConfirm,
                            onApprove: () => {
                              if (purchaseId == null) return
                              statusMutation.mutate({ purchaseId, status: "approved" })
                            },
                            openConfirm: () => setConfirmApprove(true),
                          })
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
              onConfirm={() => {
                if (purchaseId == null) return
                statusMutation.mutate({ purchaseId, status: "approved" })
              }}
            />

            <RejectPurchaseDialog
              open={rejectOpen}
              onOpenChange={setRejectOpen}
              purchaseId={purchase.id}
              customerName={purchase.customer_name}
              pending={purchase.status === "pending"}
              isPending={statusMutation.isPending}
              onConfirm={(notes) => {
                if (purchaseId == null) return
                statusMutation.mutate({ purchaseId, status: "rejected", notes })
              }}
            />

          </>
        ) : null}
      </SheetContent>
    </Sheet>

    {purchase ? (
      <EditPurchaseCustomerSheet
        open={editContactOpen}
        onOpenChange={setEditContactOpen}
        purchase={purchase}
        pending={customerUpdateMutation.isPending}
        onSave={(payload) => {
          customerUpdateMutation.mutate(payload, {
            onSuccess: () => {
              setEditContactOpen(false)
              void detailQuery.refetch()
            },
          })
        }}
      />
    ) : null}
    </>
  )
}
