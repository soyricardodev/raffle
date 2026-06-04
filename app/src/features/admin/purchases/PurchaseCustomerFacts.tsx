import { PencilSimpleIcon } from "@phosphor-icons/react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import type { PurchaseDetail } from "@/features/admin/purchases/types"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-x-2 gap-y-0.5 text-sm leading-snug">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="min-w-0 font-medium break-words">{children}</span>
    </div>
  )
}

type PurchaseCustomerFactsProps = {
  purchase: PurchaseDetail & { customer_location?: string | null }
  className?: string
  onEditContact?: () => void
  editContactDisabled?: boolean
}

export function PurchaseCustomerFacts({
  purchase,
  className,
  onEditContact,
  editContactDisabled = false,
}: PurchaseCustomerFactsProps) {
  const phone = purchase.customer_phone.replace(/\s/g, "")
  const email = purchase.customer_email?.trim()
  const notes = purchase.notes?.trim()

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {onEditContact ? (
        <div className="mb-1 flex justify-end">
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
      <Row label="Cliente">{purchase.customer_name}</Row>
      <Row label="Teléfono">
        <a href={`tel:${phone}`} className="text-primary hover:underline">
          {purchase.customer_phone}
        </a>
      </Row>
      <Row label="Cédula">{purchase.customer_ci?.trim() || "—"}</Row>
      <Row label="Email">
        {email ? (
          <a href={`mailto:${email}`} className="text-primary break-all hover:underline">
            {email}
          </a>
        ) : (
          "—"
        )}
      </Row>
      {purchase.customer_location ? (
        <Row label="Ubicación">{purchase.customer_location}</Row>
      ) : null}
      <Row label="Rifa">{purchase.raffle_name}</Row>
      <Row label="Boletos">{purchase.ticket_quantity}</Row>
      <Row label="Fecha">{formatDateTime(purchase.created_at)}</Row>
      {notes && purchase.status === "rejected" ? (
        <Row label="Motivo">{notes}</Row>
      ) : null}
    </div>
  )
}
