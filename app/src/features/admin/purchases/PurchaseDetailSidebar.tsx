import type { ReactNode } from "react"
import { PurchaseEmailsSection } from "@/features/admin/emails/PurchaseEmailsSection"
import { PurchaseTicketManager } from "@/features/admin/PurchaseTicketManager"
import { PaymentReferenceValue } from "@/features/admin/purchases/PaymentReferenceHighlight"
import { PurchaseStatusBadge } from "@/features/admin/purchases/PurchaseStatusBadge"
import { PurchaseTicketsPanel } from "@/features/admin/purchases/PurchaseTicketsPanel"
import type { PurchaseDetail } from "@/features/admin/purchases/types"
import { formatCurrencyForMethod, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

function DetailFact({
  label,
  children,
  className,
  highlight,
}: {
  label: string
  children: ReactNode
  className?: string
  highlight?: boolean
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <div
        className={cn(
          "text-sm leading-snug font-medium break-words",
          highlight && "text-base font-bold tabular-nums",
        )}
      >
        {children}
      </div>
    </div>
  )
}

type PurchaseDetailSidebarProps = {
  purchase: PurchaseDetail
  stockLoaded: boolean
  onUpdated: (patch: Partial<PurchaseDetail>) => void
}

export function PurchaseDetailSidebar({
  purchase,
  stockLoaded,
  onUpdated,
}: PurchaseDetailSidebarProps) {
  const phone = purchase.customer_phone.replace(/\s/g, "")
  const email = purchase.customer_email?.trim()
  const notes = purchase.notes?.trim()

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border bg-muted/10 p-2.5 sm:grid-cols-3">
        <DetailFact label="Cliente">{purchase.customer_name}</DetailFact>
        <DetailFact label="Teléfono">
          <a href={`tel:${phone}`} className="text-primary hover:underline">
            {purchase.customer_phone}
          </a>
        </DetailFact>
        <DetailFact label="Cédula">{purchase.customer_ci?.trim() || "—"}</DetailFact>

        <DetailFact label="Email" className="col-span-2 sm:col-span-1">
          {email ? (
            <a href={`mailto:${email}`} className="text-primary text-xs break-all hover:underline">
              {email}
            </a>
          ) : (
            "—"
          )}
        </DetailFact>
        <DetailFact label="Total" highlight>
          {formatCurrencyForMethod(purchase.total_amount, purchase.payment_method)}
        </DetailFact>
        <DetailFact label="Referencia" highlight>
          {purchase.payment_reference?.trim() ? (
            <PaymentReferenceValue reference={purchase.payment_reference} />
          ) : (
            "—"
          )}
        </DetailFact>
        {purchase.payment_payer_name?.trim() ? (
          <DetailFact label="Quien paga">{purchase.payment_payer_name.trim()}</DetailFact>
        ) : null}

        <DetailFact label="Método" className="capitalize">
          {purchase.payment_method.replace(/_/g, " ")}
        </DetailFact>
        <DetailFact label="Fecha" className="text-xs tabular-nums">
          {formatDateTime(purchase.created_at)}
        </DetailFact>
        <DetailFact label="Boletos">{purchase.ticket_quantity}</DetailFact>

        <DetailFact label="Ubicación">
          <span className="line-clamp-2 text-xs leading-snug">
            {purchase.customer_location?.trim() || "—"}
          </span>
        </DetailFact>
        <DetailFact label="Rifa">
          <span className="line-clamp-2 text-xs leading-snug">{purchase.raffle_name}</span>
        </DetailFact>
        <DetailFact label="Estado">
          <PurchaseStatusBadge status={purchase.status} className="text-xs" />
        </DetailFact>

        {notes && purchase.status === "rejected" ? (
          <DetailFact label="Motivo" className="col-span-2 sm:col-span-3">
            <span className="text-destructive text-xs">{notes}</span>
          </DetailFact>
        ) : null}
      </div>

      {!purchase.payment_proof_url ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">Sin comprobante adjunto</p>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col gap-1 rounded-lg border p-2">
        <PurchaseTicketsPanel
          ticketNumbers={purchase.ticketNumbers}
          ticketNumbersCsv={purchase.ticket_numbers}
          className="min-h-0 flex-1"
          toolbarEnd={
            <PurchaseTicketManager
              purchase={purchase}
              stockLoaded={stockLoaded}
              onUpdated={onUpdated}
              embedded
              compactToolbar
            />
          }
        />
      </section>

      <PurchaseEmailsSection purchase={purchase} />
    </div>
  )
}
