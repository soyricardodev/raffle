import { DEFAULT_PURCHASE_REJECT_REASONS } from "@raffle/shared/site-config"
import { Plus, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FieldDescription, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const MAX_REASONS = 20
const MAX_REASON_LENGTH = 500

type PurchaseRejectReasonsEditorProps = {
  reasons: string[]
  onChange: (reasons: string[]) => void
  fieldError: (path: string) => string | undefined
}

export function PurchaseRejectReasonsEditor({
  reasons,
  onChange,
  fieldError,
}: PurchaseRejectReasonsEditorProps) {
  function updateAt(index: number, value: string) {
    onChange(reasons.map((reason, i) => (i === index ? value : reason)))
  }

  function removeAt(index: number) {
    if (reasons.length <= 1) return
    onChange(reasons.filter((_, i) => i !== index))
  }

  function addReason() {
    if (reasons.length >= MAX_REASONS) return
    onChange([...reasons, ""])
  }

  function restoreDefaults() {
    onChange([...DEFAULT_PURCHASE_REJECT_REASONS])
  }

  const listError = fieldError("purchase_reject_reasons")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium">Motivos rápidos al rechazar</p>
          <p className="text-muted-foreground text-xs">
            Aparecen como botones al rechazar una compra. Si eliges uno, el cliente lo verá en el
            correo de rechazo.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9"
            onClick={restoreDefaults}
          >
            <RotateCcw className="mr-1 size-4" />
            Restaurar predeterminados
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9"
            disabled={reasons.length >= MAX_REASONS}
            onClick={addReason}
          >
            <Plus className="mr-1 size-4" />
            Agregar
          </Button>
        </div>
      </div>

      {listError ? <FieldError>{listError}</FieldError> : null}

      <ul className="flex flex-col gap-3">
        {reasons.map((reason, index) => {
          const itemError = fieldError(`purchase_reject_reasons.${index}`)
          return (
            <li
              key={`reject-reason-${index}`}
              className="border-border/80 flex flex-col gap-2 rounded-xl border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs font-medium">Motivo {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive size-9 shrink-0"
                  disabled={reasons.length <= 1}
                  aria-label={`Eliminar motivo ${index + 1}`}
                  onClick={() => removeAt(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Input
                className="min-h-11"
                value={reason}
                maxLength={MAX_REASON_LENGTH}
                placeholder="Texto que verá el cliente"
                aria-invalid={!!itemError}
                onChange={(e) => updateAt(index, e.target.value)}
              />
              {itemError ? <FieldError>{itemError}</FieldError> : null}
            </li>
          )
        })}
      </ul>

      <FieldDescription>Máximo {MAX_REASONS} motivos, {MAX_REASON_LENGTH} caracteres cada uno.</FieldDescription>
    </div>
  )
}
