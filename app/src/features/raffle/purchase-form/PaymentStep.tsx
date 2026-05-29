import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { PaymentDetailsPanel } from "@/features/raffle/purchase-form/PaymentDetailsPanel"
import { PaymentProofUpload } from "@/features/raffle/purchase-form/PaymentProofUpload"
import { SectionHeader } from "@/features/raffle/purchase-form/ui"
import {
  paymentMethodCurrencyLabel,
  paymentMethodDisplayLabel,
} from "@raffle/shared/payment-methods"
import type { RafflePaymentMethod } from "@/features/raffle/types"
import type { MethodEligibility } from "@/features/raffle/payment-method-eligibility"
import { cn } from "@/lib/utils"

type PaymentStepProps = {
  methods: RafflePaymentMethod[]
  quantity: number
  disabled: boolean
  selectedId: number | null
  selectedMethod: RafflePaymentMethod | null
  total: number
  paymentReference: string
  paymentProof: File | null
  methodHint?: string
  referenceHint?: string
  proofHint?: string
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
  paymentProof,
  methodHint,
  referenceHint,
  proofHint,
  getEligibility,
  onSelectMethod,
  onPaymentReferenceChange,
  onPaymentProofChange,
}: PaymentStepProps) {
  return (
    <section id="purchase-payment" className="flex flex-col gap-2">
      <SectionHeader title="Pago" />

      {methods.length === 0 ? (
        <p className="text-muted-foreground text-xs">Sin métodos de pago.</p>
      ) : (
        <FieldGroup className="gap-3">
          <Field data-invalid={!!methodHint}>
            <FieldLabel id="payment-method-label" className="sr-only">
              Método
            </FieldLabel>
            <div
              role="radiogroup"
              aria-labelledby="payment-method-label"
              className="flex flex-col gap-1.5"
            >
              {methods.map((method) => {
                const active = selectedId === method.id
                const { locked, minTickets } = getEligibility(method)
                const currency = paymentMethodCurrencyLabel(method.method_type)
                const title = paymentMethodDisplayLabel(method)

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
                      "flex min-h-10 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                      active ? "border-primary bg-primary/10" : "border-border bg-card",
                      locked && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "size-4 shrink-0 rounded-full border-2",
                        active ? "border-primary bg-primary" : "border-muted-foreground/40",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {currency}
                    </Badge>
                    {locked ? (
                      <span className="text-destructive shrink-0 text-[10px]">
                        min {minTickets}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
            <FieldError>{methodHint}</FieldError>
          </Field>

          {selectedMethod ? (
            <PaymentDetailsPanel method={selectedMethod} total={total} quantity={quantity} />
          ) : null}

          <Field data-invalid={!!referenceHint}>
            <FieldLabel htmlFor="payment-reference">Referencia</FieldLabel>
            <Input
              id="payment-reference"
              value={paymentReference}
              onChange={(event) => onPaymentReferenceChange(event.target.value)}
              disabled={disabled || !selectedMethod}
              aria-invalid={!!referenceHint}
              className="h-9"
              placeholder="Nº referencia (mín. 10 dígitos)"
              inputMode="numeric"
              minLength={10}
              maxLength={100}
            />
            <FieldError>{referenceHint}</FieldError>
          </Field>

          <PaymentProofUpload
            file={paymentProof}
            disabled={disabled || !selectedMethod}
            error={proofHint}
            onChange={onPaymentProofChange}
          />
        </FieldGroup>
      )}
    </section>
  )
}
