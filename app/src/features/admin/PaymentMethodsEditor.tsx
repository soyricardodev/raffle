import { Plus, Trash } from "@phosphor-icons/react"
import { PaymentMethod } from "@raffle/shared/validators"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"

export type PaymentMethodDraft = {
  method_type: string
  account_info: Record<string, string>
  /** Mínimo de boletos para poder usar este método; vacío = sin mínimo */
  min_tickets: string
}

const defaultMethod = (): PaymentMethodDraft => ({
  method_type: "pago_movil",
  account_info: { banco: "", telefono: "", cedula: "" },
  min_tickets: "",
})

const METHOD_LABELS: Record<string, string> = {
  pago_movil: "Pago móvil",
  zinli: "Zinli",
  zelle: "Zelle",
  binance: "Binance",
  bs: "Bolívares",
  usd: "Dólares",
}

function methodLabel(type: string) {
  return METHOD_LABELS[type] ?? type.replace(/_/g, " ")
}

type PaymentMethodsEditorProps = {
  methods: Array<PaymentMethodDraft>
  onChange: (methods: Array<PaymentMethodDraft>) => void
}

export function PaymentMethodsEditor({ methods, onChange }: PaymentMethodsEditorProps) {
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)

  function updateMethod(index: number, patch: Partial<PaymentMethodDraft>) {
    onChange(methods.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function updateAccountField(index: number, field: string, value: string) {
    onChange(
      methods.map((item, i) =>
        i === index
          ? { ...item, account_info: { ...item.account_info, [field]: value } }
          : item,
      ),
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Métodos de pago</CardTitle>
          <CardDescription>
            Datos que verá el comprador. Puedes exigir un mínimo de boletos por método.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 shrink-0"
          onClick={() => onChange([...methods, defaultMethod()])}
        >
          <Plus data-icon="inline-start" />
          Agregar
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {methods.length === 0 && (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Agrega al menos un método de pago para que los compradores puedan pagar.
          </p>
        )}
        {methods.map((method, index) => (
          <div key={index} className="flex flex-col gap-4 rounded-xl border bg-muted/10 p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Field className="min-w-[200px] flex-1">
                <FieldLabel htmlFor={`method-type-${index}`}>Método</FieldLabel>
                <Select
                  value={method.method_type}
                  onValueChange={(value) => updateMethod(index, { method_type: value })}
                >
                  <SelectTrigger id={`method-type-${index}`} className="min-h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PaymentMethod.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {methodLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {methods.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label="Eliminar método"
                  onClick={() => setRemoveIndex(index)}
                >
                  <Trash />
                </Button>
              )}
            </div>

            <Field>
              <FieldLabel htmlFor={`min-tickets-${index}`}>Mínimo de boletos</FieldLabel>
              <Input
                id={`min-tickets-${index}`}
                type="number"
                min={1}
                placeholder="Sin mínimo"
                className="min-h-11"
                value={method.min_tickets}
                onChange={(e) => updateMethod(index, { min_tickets: e.target.value })}
              />
              <FieldDescription>
                El comprador sólo podrá elegir este método si compra al menos esta cantidad.
              </FieldDescription>
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor={`banco-${index}`}>Banco</FieldLabel>
                <Input
                  id={`banco-${index}`}
                  placeholder="Ej. Banesco"
                  className="min-h-11"
                  value={method.account_info.banco || ""}
                  onChange={(e) => updateAccountField(index, "banco", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`telefono-${index}`}>Teléfono</FieldLabel>
                <Input
                  id={`telefono-${index}`}
                  placeholder="04XX…"
                  className="min-h-11"
                  value={method.account_info.telefono || ""}
                  onChange={(e) => updateAccountField(index, "telefono", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`cedula-${index}`}>Cédula</FieldLabel>
                <Input
                  id={`cedula-${index}`}
                  placeholder="V-…"
                  className="min-h-11"
                  value={method.account_info.cedula || ""}
                  onChange={(e) => updateAccountField(index, "cedula", e.target.value)}
                />
              </Field>
            </div>
          </div>
        ))}
      </CardContent>

      <ConfirmAction
        open={removeIndex !== null}
        onOpenChange={(open) => !open && setRemoveIndex(null)}
        title="Eliminar método de pago"
        description="¿Quitar este método? Los compradores ya no podrán usarlo en esta rifa."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (removeIndex === null) return
          onChange(methods.filter((_, i) => i !== removeIndex))
          setRemoveIndex(null)
        }}
      />
    </Card>
  )
}

export { defaultMethod as defaultPaymentMethod }
