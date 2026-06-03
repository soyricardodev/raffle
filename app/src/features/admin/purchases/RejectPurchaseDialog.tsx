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
import { Textarea } from "@/components/ui/textarea"

export const DUPLICATE_PAYMENT_REASON = "Pago duplicado"
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
      <DialogContent className="sm:max-w-md">
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
              placeholder="Ej. pago duplicado, referencia incorrecta…"
              rows={3}
              maxLength={MAX_NOTES_LENGTH}
              disabled={isPending}
            />
            <FieldDescription>
              Si indicas un motivo, el cliente lo verá en el correo de rechazo.
            </FieldDescription>
          </Field>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => setNotes(DUPLICATE_PAYMENT_REASON)}
          >
            Usar: {DUPLICATE_PAYMENT_REASON}
          </Button>
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
