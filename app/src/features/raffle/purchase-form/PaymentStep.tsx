import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PaymentDetailsPanel } from "@/features/raffle/purchase-form/PaymentDetailsPanel"
import { FieldHint, SectionHeader } from "@/features/raffle/purchase-form/ui"
import {
  formatAccountInfoForDisplay,
  paymentMethodCurrencyLabel,
  paymentMethodDisplayLabel,
  paymentMethodTypeLabel,
} from "@raffle/shared/payment-methods"
import type { RafflePaymentMethod } from "@/features/raffle/types"
import type { MethodEligibility } from "@/features/raffle/payment-method-eligibility"
import { cn } from "@/lib/utils"
import { CreditCard } from "lucide-react"

type PaymentStepProps = {
  methods: RafflePaymentMethod[]
  quantity: number
  disabled: boolean
  selectedId: number | null
  selectedMethod: RafflePaymentMethod | null
  total: number
  paymentReference: string
  methodHint?: string
  referenceHint?: string
  getEligibility: (method: RafflePaymentMethod) => MethodEligibility
  onSelectMethod: (id: number) => void
  onPaymentReferenceChange: (value: string) => void
  onPaymentProofChange: (file: File | null) => void
}

export function PaymentStep({
  methods,
  quantity,
  disabled,
  selectedId,
  selectedMethod,
  total,
  paymentReference,
  methodHint,
  referenceHint,
  getEligibility,
  onSelectMethod,
  onPaymentReferenceChange,
  onPaymentProofChange,
}: PaymentStepProps) {
  const accountDisplayLines = selectedMethod
    ? formatAccountInfoForDisplay(selectedMethod.method_type, selectedMethod.account_info)
    : []

  return (
    <section className="space-y-4">
      <SectionHeader step={3} title="Pago" />

      {methods.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <CreditCard className="text-muted-foreground mx-auto mb-2 size-8" />
          <p className="text-sm font-medium">Sin métodos de pago</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Esta rifa aún no tiene cuentas configuradas. Intenta más tarde.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label id="payment-method-label">Elige cómo pagar *</Label>
            <div
              role="radiogroup"
              aria-labelledby="payment-method-label"
              className="flex flex-col gap-2"
            >
              {methods.map((method) => {
                const active = selectedId === method.id
                const { locked, minTickets } = getEligibility(method)
                const currency = paymentMethodCurrencyLabel(method.method_type)
                const title = paymentMethodDisplayLabel(method)
                const subtitle = method.label ? paymentMethodTypeLabel(method.method_type) : null

                return (
                  <button
                    key={`rpm-${method.id}`}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`payment-method-${method.id}`}
                    disabled={disabled || locked}
                    onClick={() => onSelectMethod(method.id)}
                    className={cn(
                      "flex min-h-14 w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
                      active
                        ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                        : "border-border bg-card hover:border-primary/40",
                      locked && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                      aria-hidden
                    >
                      {active ? <span className="size-2.5 rounded-full bg-primary" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{title}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {currency}
                        </Badge>
                      </span>
                      {subtitle ? (
                        <span className="text-muted-foreground mt-0.5 block text-xs">{subtitle}</span>
                      ) : null}
                      {locked ? (
                        <span className="text-destructive mt-1 block text-xs font-medium">
                          Necesitas al menos {minTickets} boletos (tienes {quantity})
                        </span>
                      ) : minTickets > 0 ? (
                        <span className="text-muted-foreground mt-1 block text-xs">
                          Disponible desde {minTickets} boletos
                        </span>
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
            <FieldHint message={methodHint} />
          </div>

          {selectedMethod && accountDisplayLines.length > 0 ? (
            <PaymentDetailsPanel method={selectedMethod} total={total} />
          ) : selectedMethod ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              No hay datos de cuenta para este método. Elige otro o contacta al organizador.
            </p>
          ) : (
            <p className="text-muted-foreground text-center text-xs">
              Selecciona un método para ver los datos de pago.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment-reference">Referencia de pago *</Label>
            <Input
              id="payment-reference"
              value={paymentReference}
              onChange={(event) => onPaymentReferenceChange(event.target.value)}
              disabled={disabled || !selectedMethod}
              aria-invalid={!!referenceHint}
              className="min-h-11"
              placeholder="Últimos dígitos o número de referencia"
            />
            <FieldHint message={referenceHint} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-proof">Comprobante (opcional)</Label>
            <Input
              id="payment-proof"
              type="file"
              accept="image/*,application/pdf"
              disabled={disabled || !selectedMethod}
              className="min-h-11 file:mr-3"
              onChange={(event) => onPaymentProofChange(event.target.files?.[0] ?? null)}
            />
            <p className="text-muted-foreground text-xs">Foto o PDF del comprobante.</p>
          </div>
        </>
      )}
    </section>
  )
}
