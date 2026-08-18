import { ReceiptIcon } from "@phosphor-icons/react"
import type { PaymentReferenceInputMode } from "@raffle/shared/validators"
import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import type { MethodEligibility } from "@/features/raffle/payment-method-eligibility"
import {
  paymentCompletionBoxClassName,
  paymentSectionCardClassName,
} from "@/features/raffle/purchase-form/field-styles"
import { PaymentMethodCard } from "@/features/raffle/purchase-form/PaymentMethodCard"
import { PaymentProofUpload } from "@/features/raffle/purchase-form/PaymentProofUpload"
import { PaymentReferenceField } from "@/features/raffle/purchase-form/PaymentReferenceField"
import type { RafflePaymentMethod } from "@/features/raffle/types"
import { cn } from "@/lib/utils"

type PaymentStepProps = {
  methods: RafflePaymentMethod[]
  quantity: number
  disabled: boolean
  selectedId: number | null
  selectedMethod: RafflePaymentMethod | null
  methodPromotionBadges?: Record<number, string>
  methodPromotionHint?: string | null
  total: number
  paymentReference: string
  referenceMinLength: number
  referenceInputMode: PaymentReferenceInputMode
  paymentProof: File | null
  methodHint?: string
  referenceHint?: string
  proofHint?: string
  getEligibility: (method: RafflePaymentMethod) => MethodEligibility
  onSelectMethod: (id: number) => void
  onPaymentReferenceChange: (value: string) => void
  onPaymentProofChange: (file: File | null) => void
}

type PaymentMethodPickerProps = {
  methods: RafflePaymentMethod[]
  disabled: boolean
  selectedId: number | null
  methodPromotionBadges?: Record<number, string>
  methodHint?: string
  total: number
  quantity: number
  getEligibility: (method: RafflePaymentMethod) => MethodEligibility
  onSelectMethod: (id: number) => void
}

const PaymentMethodPicker = memo(function PaymentMethodPicker({
  methods,
  disabled,
  selectedId,
  methodPromotionBadges = {},
  methodHint,
  total,
  quantity,
  getEligibility,
  onSelectMethod,
}: PaymentMethodPickerProps) {
  return (
    <Field data-invalid={!!methodHint} className="gap-2">
      <div className="px-0.5">
        <FieldLabel id="payment-method-label" className="text-sm font-semibold">
          Elige cómo vas a pagar
        </FieldLabel>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Toca una opción para ver los datos y copiar rápido.
        </p>
      </div>
      <div role="radiogroup" aria-labelledby="payment-method-label" className="flex flex-col gap-2">
        {methods.map((method) => (
          <PaymentMethodCard
            key={`rpm-${method.id}`}
            method={method}
            active={selectedId === method.id}
            disabled={disabled}
            eligibility={getEligibility(method)}
            promoBadge={methodPromotionBadges[method.id]}
            total={total}
            quantity={quantity}
            onSelect={onSelectMethod}
          />
        ))}
      </div>
      <FieldError>{methodHint}</FieldError>
    </Field>
  )
})

type PaymentCompletionFieldsProps = {
  disabled: boolean
  paymentReference: string
  referenceMinLength: number
  referenceInputMode: PaymentReferenceInputMode
  paymentProof: File | null
  referenceHint?: string
  proofHint?: string
  onPaymentReferenceChange: (value: string) => void
  onPaymentProofChange: (file: File | null) => void
}

const PaymentCompletionFields = memo(function PaymentCompletionFields({
  disabled,
  paymentReference,
  referenceMinLength,
  referenceInputMode,
  paymentProof,
  referenceHint,
  proofHint,
  onPaymentReferenceChange,
  onPaymentProofChange,
}: PaymentCompletionFieldsProps) {
  const isNumeric = referenceInputMode === "numeric"

  return (
    <div className={paymentCompletionBoxClassName}>
      <div className="flex items-start gap-2">
        <ReceiptIcon
          className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        <div>
          <p className="text-sm font-semibold">Confirma tu pago</p>
          <p className="text-muted-foreground text-xs leading-snug">
            {isNumeric
              ? "Paso final: indica los últimos dígitos de la referencia y sube el comprobante para validar tu compra."
              : "Paso final: indica la referencia de tu transferencia y sube el comprobante para validar tu compra."}
          </p>
        </div>
      </div>

      <PaymentReferenceField
        value={paymentReference}
        minLength={referenceMinLength}
        inputMode={referenceInputMode}
        disabled={disabled}
        error={referenceHint}
        onChange={onPaymentReferenceChange}
      />

      <Separator />

      <PaymentProofUpload
        file={paymentProof}
        disabled={disabled}
        error={proofHint}
        onChange={onPaymentProofChange}
      />
    </div>
  )
})

export const PaymentStep = memo(function PaymentStep({
  methods,
  quantity,
  disabled,
  selectedId,
  selectedMethod,
  methodPromotionBadges,
  methodPromotionHint,
  total,
  paymentReference,
  referenceMinLength,
  referenceInputMode,
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
    <section
      id="purchase-payment"
      className={cn(paymentSectionCardClassName, "flex flex-col gap-3")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge className="shrink-0 border-0 bg-emerald-600 text-white tabular-nums hover:bg-emerald-600">
              3
            </Badge>
            <h3 className="text-sm font-semibold">Método de pago</h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs leading-snug">
            Transfiere, copia los datos y completa referencia y comprobante.
          </p>
        </div>
      </div>

      {methods.length === 0 ? (
        <p className="text-muted-foreground text-xs">Sin métodos de pago.</p>
      ) : (
        <FieldGroup className="gap-4">
          {methodPromotionHint ? (
            <p
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs leading-snug text-emerald-950 dark:text-emerald-50"
              data-testid="method-promotion-hint"
            >
              {methodPromotionHint}
            </p>
          ) : null}
          <PaymentMethodPicker
            methods={methods}
            disabled={disabled}
            selectedId={selectedId}
            methodPromotionBadges={methodPromotionBadges}
            methodHint={methodHint}
            total={total}
            quantity={quantity}
            getEligibility={getEligibility}
            onSelectMethod={onSelectMethod}
          />

          {selectedMethod ? (
            <PaymentCompletionFields
              disabled={disabled}
              paymentReference={paymentReference}
              referenceMinLength={referenceMinLength}
              referenceInputMode={referenceInputMode}
              paymentProof={paymentProof}
              referenceHint={referenceHint}
              proofHint={proofHint}
              onPaymentReferenceChange={onPaymentReferenceChange}
              onPaymentProofChange={onPaymentProofChange}
            />
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 px-3 py-4 text-center text-xs">
              Elige un método arriba para ver los datos de pago y completar tu compra.
            </p>
          )}
        </FieldGroup>
      )}
    </section>
  )
})
