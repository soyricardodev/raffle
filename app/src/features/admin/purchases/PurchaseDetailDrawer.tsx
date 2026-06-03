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
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { PaymentProofPreview } from "@/features/admin/purchases/PaymentProofPreview"
import { PurchaseEmailsSection } from "@/features/admin/emails/PurchaseEmailsSection"
import { PurchaseCustomerFacts } from "@/features/admin/purchases/PurchaseCustomerFacts"
import { PurchaseDrawerActions } from "@/features/admin/purchases/PurchaseDrawerActions"
import { PurchaseStatusBadge } from "@/features/admin/purchases/PurchaseStatusBadge"
import { PurchaseTicketsPanel } from "@/features/admin/purchases/PurchaseTicketsPanel"
import type { PurchaseDetail, PurchaseRow } from "@/features/admin/purchases/types"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrencyForMethod } from "@/lib/format"
import { cn } from "@/lib/utils"

const DRAWER_WIDTH_CLASS = "!w-full !max-w-full sm:!w-[min(96vw,72rem)] sm:!max-w-[min(96vw,72rem)]"

type PurchaseApi = {
  id: number
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  customer_ci?: string | null
  customer_location?: string | null
  payment_method: string
  payment_reference?: string | null
  payment_proof_url?: string | null
  ticket_quantity: number
  total_amount: number | string
  status: string
  created_at: string | Date
  raffle_name: string
  ticketNumbers: Array<string>
}

function mapApiToDetail(data: PurchaseApi): PurchaseDetail {
  return {
    id: data.id,
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    customer_email: data.customer_email ?? undefined,
    customer_ci: data.customer_ci ?? undefined,
    customer_location: data.customer_location ?? null,
    raffle_name: data.raffle_name,
    ticket_quantity: data.ticket_quantity,
    total_amount: data.total_amount,
    payment_method: data.payment_method,
    status: data.status,
    created_at:
      typeof data.created_at === "string"
        ? data.created_at
        : new Date(data.created_at).toISOString(),
    payment_reference: data.payment_reference ?? undefined,
    payment_proof_url: data.payment_proof_url,
    ticket_numbers: data.ticketNumbers.join(", "),
    ticketNumbers: data.ticketNumbers,
  }
}

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
    <div className="mb-3 shrink-0 space-y-1 border-b pb-3 text-sm">
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
        <p className="text-amber-600 dark:text-amber-400 pt-1 text-xs">Sin comprobante adjunto</p>
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
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null)
  const [localPatch, setLocalPatch] = useState<Partial<PurchaseDetail>>({})

  const handlePurchaseUpdated = (patch: Partial<PurchaseDetail>) => {
    setLocalPatch((prev) => ({ ...prev, ...patch }))
    onPurchaseUpdated?.(patch)
  }

  const detailQuery = useQuery({
    queryKey: ["admin", "purchase", purchaseId],
    queryFn: () => adminFetch<PurchaseApi>(`/api/admin/purchases/${purchaseId}`),
    enabled: open && purchaseId != null,
  })

  const purchase: PurchaseDetail | null =
    detailQuery.data != null
      ? { ...mapApiToDetail(detailQuery.data), ...localPatch }
      : fallbackPurchase != null
        ? { ...mapRowToDetail(fallbackPurchase), ...localPatch }
        : null

  const isPending = purchase?.status === "pending"

  const statusMutation = useMutation({
    mutationFn: async (status: "approved" | "rejected") => {
      if (!purchaseId) throw new Error("Sin compra")
      return adminFetch(`/api/admin/purchases/${purchaseId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      })
    },
    onSuccess: (_data, status) => {
      toast.success(status === "approved" ? "Compra aprobada" : "Compra rechazada")
      void queryClient.invalidateQueries({ queryKey: ["admin"] })
      setConfirm(null)
      setLocalPatch({})
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setConfirm(null)
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
            <SheetHeader className="shrink-0 border-b px-4 py-3">
              <div className="flex items-center justify-between gap-2 pr-8">
                <SheetTitle className="text-base">Compra #{purchase.id}</SheetTitle>
                <PurchaseStatusBadge status={purchase.status} />
              </div>
              <SheetDescription className="sr-only">Detalle de compra</SheetDescription>
            </SheetHeader>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
              <div className="flex min-h-0 flex-col gap-3 overflow-y-auto border-b p-4 lg:border-b-0 lg:border-r">
                <PurchaseCustomerFacts purchase={purchase} />
                <PurchaseEmailsSection purchase={purchase} />
                <PurchaseTicketsPanel
                  ticketNumbers={purchase.ticketNumbers}
                  ticketNumbersCsv={purchase.ticket_numbers}
                />
                <PurchaseTicketManager purchase={purchase} onUpdated={handlePurchaseUpdated} />
              </div>

              <div className="flex min-h-0 flex-col overflow-hidden p-4">
                <p className="text-muted-foreground mb-2 shrink-0 text-xs font-medium uppercase">
                  Pago
                </p>
                <PaymentMeta purchase={purchase} />
                {purchase.payment_proof_url ? (
                  <PaymentProofPreview url={purchase.payment_proof_url} className="min-h-[200px]" />
                ) : null}
              </div>
            </div>

            {isPending && (
              <SheetFooter className="shrink-0 border-t p-0">
                <PurchaseDrawerActions
                  pending
                  disabled={statusMutation.isPending}
                  className="w-full"
                  onApprove={() => setConfirm("approve")}
                  onReject={() => setConfirm("reject")}
                />
              </SheetFooter>
            )}

            <ConfirmAction
              open={confirm === "approve"}
              onOpenChange={(next) => !next && setConfirm(null)}
              title="Aprobar compra"
              description={`¿Confirmas la compra #${purchase.id}?`}
              confirmLabel="Aprobar"
              pending={statusMutation.isPending}
              onConfirm={() => statusMutation.mutate("approved")}
            />

            <ConfirmAction
              open={confirm === "reject"}
              onOpenChange={(next) => !next && setConfirm(null)}
              title="Rechazar compra"
              description="Los boletos quedarán liberados."
              confirmLabel="Rechazar"
              pending={statusMutation.isPending}
              destructive
              onConfirm={() => statusMutation.mutate("rejected")}
            />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
