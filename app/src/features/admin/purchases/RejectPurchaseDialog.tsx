import {
  DUPLICATE_PAYMENT_REASON,
  normalizePurchaseRejectReasons,
} from "@raffle/shared/site-config"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { adminFetch } from "@/lib/admin-fetch"

export { DUPLICATE_PAYMENT_REASON }

const MAX_NOTES_LENGTH = 500

type RejectPurchaseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseId: number
  customerName?: string
  pending?: boolean
  onConfirm: (notes?: string) => void
  isPending?: boolean
}

export function RejectPurchaseDialog({
  open,
  onOpenChange,
  purchaseId,
  customerName,
  pending = false,
  onConfirm,
  isPending = false,
}: RejectPurchaseDialogProps) {
  const [notes, setNotes] = useState("")

  const configQuery = useQuery({
    queryKey: ["admin", "config"],
    queryFn: () => adminFetch<Record<string, unknown>>("/api/admin/config"),
    enabled: open,
    staleTime: 60_000,
  })

  const quickReasons = normalizePurchaseRejectReasons(
    configQuery.isError ? undefined : configQuery.data?.purchase_reject_reasons,
  )

  useEffect(() => {
    if (!open) setNotes("")
  }, [open])

  const trimmed = notes.trim()
  const canSubmit = trimmed.length <= MAX_NOTES_LENGTH

  function handleConfirm() {
    if (!canSubmit) return
    onConfirm(trimmed || undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rechazar compra</DialogTitle>
          <DialogDescription>
            {customerName
              ? `Compra #${purchaseId} de ${customerName}.`
              : `Compra #${purchaseId}.`}{" "}
            Los boletos quedarán liberados
            {pending ? " (aún no vendidos definitivamente)." : " y dejarán de contar como vendidos."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="reject-notes">Motivo (opcional)</FieldLabel>
            <Textarea
              id="reject-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. pago duplicado, referencia no compatible con la imagen…"
              rows={3}
              maxLength={MAX_NOTES_LENGTH}
              disabled={isPending}
            />
            <FieldDescription>
              Si indicas un motivo, el cliente lo verá en el correo de rechazo.
            </FieldDescription>
          </Field>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Motivos rápidos</p>
            {configQuery.isLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-36 rounded-md" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {quickReasons.map((reason) => (
                  <Button
                    key={reason}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-9 max-w-full py-2 text-left whitespace-normal"
                    title={reason}
                    disabled={isPending}
                    onClick={() => setNotes(reason)}
                  >
                    Usar: {reason}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </FieldGroup>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || !canSubmit}
            onClick={handleConfirm}
          >
            Rechazar compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
