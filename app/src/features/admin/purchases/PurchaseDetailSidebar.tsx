import { PencilSimpleIcon } from "@phosphor-icons/react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { PurchaseEmailsSection } from "@/features/admin/emails/PurchaseEmailsSection"
import { PurchaseTicketManager } from "@/features/admin/PurchaseTicketManager"
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
  onEditContact?: () => void
  editContactDisabled?: boolean
  onUpdated: (patch: Partial<PurchaseDetail>) => void
}

export function PurchaseDetailSidebar({
  purchase,
  stockLoaded,
  onEditContact,
  editContactDisabled = false,
  onUpdated,
}: PurchaseDetailSidebarProps) {
  const phone = purchase.customer_phone.replace(/\s/g, "")
  const email = purchase.customer_email?.trim()
  const notes = purchase.notes?.trim()

  return (
    <div className="flex flex-col gap-2">
      {onEditContact ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            disabled={editContactDisabled}
            onClick={onEditContact}
          >
            <PencilSimpleIcon className="size-3.5" aria-hidden />
            Editar datos
          </Button>
        </div>
      ) : null}

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
          <span className="font-mono text-sm font-bold break-all">
            {purchase.payment_reference?.trim() || "—"}
          </span>
        </DetailFact>

        <DetailFact label="Método" className="capitalize">
          {purchase.payment_method.replace(/_/g, " ")}
        </DetailFact>
        <DetailFact label="Fecha" className="text-xs tabular-nums">
          {formatDateTime(purchase.created_at)}
        </DetailFact>
        <DetailFact label="Boletos">{purchase.ticket_quantity}</DetailFact>

        <DetailFact label="Rifa" className="col-span-2 sm:col-span-3">
          <span className="line-clamp-2 text-xs leading-snug">{purchase.raffle_name}</span>
        </DetailFact>

        {purchase.customer_location ? (
          <DetailFact label="Ubicación" className="col-span-2 sm:col-span-3">
            {purchase.customer_location}
          </DetailFact>
        ) : null}

        {notes && purchase.status === "rejected" ? (
          <DetailFact label="Motivo" className="col-span-2 sm:col-span-3">
            <span className="text-destructive text-xs">{notes}</span>
          </DetailFact>
        ) : null}
      </div>

      {!purchase.payment_proof_url ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">Sin comprobante adjunto</p>
      ) : null}

      <div className="grid gap-2 lg:grid-cols-2 lg:items-start">
        <PurchaseEmailsSection purchase={purchase} />
        <section className="rounded-lg border p-2">
          <PurchaseTicketsPanel
            ticketNumbers={purchase.ticketNumbers}
            ticketNumbersCsv={purchase.ticket_numbers}
          />
          <PurchaseTicketManager
            purchase={purchase}
            stockLoaded={stockLoaded}
            onUpdated={onUpdated}
            embedded
          />
        </section>
      </div>
    </div>
  )
}
