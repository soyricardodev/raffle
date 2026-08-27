import { UserCircleIcon } from "@phosphor-icons/react"
import type { PaymentReferenceInputMode } from "@raffle/shared/validators"
import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import type { MethodEligibility } from "@/features/raffle/payment-method-eligibility"
import { purchaseStepClassName } from "@/features/raffle/purchase-form/field-styles"
import { LabeledIconField } from "@/features/raffle/purchase-form/LabeledIconField"
import { PaymentMethodCard } from "@/features/raffle/purchase-form/PaymentMethodCard"
import { PaymentProofUpload } from "@/features/raffle/purchase-form/PaymentProofUpload"
import { PaymentReferenceField } from "@/features/raffle/purchase-form/PaymentReferenceField"
import type { RafflePaymentMethod } from "@/features/raffle/types"

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
  paymentPayerName: string
  referenceMinLength: number
  referenceInputMode: PaymentReferenceInputMode
  paymentProof: File | null
  methodHint?: string
  referenceHint?: string
  payerNameHint?: string
  proofHint?: string
  getEligibility: (method: RafflePaymentMethod) => MethodEligibility
  onSelectMethod: (id: number) => void
  onPaymentReferenceChange: (value: string) => void
  onPaymentPayerNameChange: (value: string) => void
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
      <FieldLabel id="payment-method-label" className="sr-only">
        Elige cómo vas a pagar
      </FieldLabel>
      <div
        role="radiogroup"
        aria-labelledby="payment-method-heading"
        className="flex flex-col gap-2"
      >
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
  isZelle: boolean
  paymentReference: string
  paymentPayerName: string
  referenceMinLength: number
  referenceInputMode: PaymentReferenceInputMode
  paymentProof: File | null
  referenceHint?: string
  payerNameHint?: string
  proofHint?: string
  onPaymentReferenceChange: (value: string) => void
  onPaymentPayerNameChange: (value: string) => void
  onPaymentProofChange: (file: File | null) => void
}

const PaymentCompletionFields = memo(function PaymentCompletionFields({
  disabled,
  isZelle,
  paymentReference,
  paymentPayerName,
  referenceMinLength,
  referenceInputMode,
  paymentProof,
  referenceHint,
  payerNameHint,
  proofHint,
  onPaymentReferenceChange,
  onPaymentPayerNameChange,
  onPaymentProofChange,
}: PaymentCompletionFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <PaymentReferenceField
        value={paymentReference}
        minLength={referenceMinLength}
        inputMode={referenceInputMode}
        disabled={disabled}
        error={referenceHint}
        onChange={onPaymentReferenceChange}
      />
      {isZelle ? (
        <LabeledIconField
          id="payment-payer-name"
          label="Nombre de quien hace el pago"
          description="Tal como aparece en el Zelle."
          icon={<UserCircleIcon aria-hidden />}
          value={paymentPayerName}
          onChange={onPaymentPayerNameChange}
          disabled={disabled}
          error={payerNameHint}
          success={!payerNameHint && paymentPayerName.trim().length > 0}
          autoComplete="name"
        />
      ) : null}
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
  paymentPayerName,
  referenceMinLength,
  referenceInputMode,
  paymentProof,
  methodHint,
  referenceHint,
  payerNameHint,
  proofHint,
  getEligibility,
  onSelectMethod,
  onPaymentReferenceChange,
  onPaymentPayerNameChange,
  onPaymentProofChange,
}: PaymentStepProps) {
  return (
    <section id="purchase-payment" className={purchaseStepClassName}>
      <div className="flex items-center gap-2">
        <Badge className="shrink-0 border-0 bg-emerald-600 text-white tabular-nums hover:bg-emerald-600">
          3
        </Badge>
        <h3 id="payment-method-heading" className="text-sm font-semibold">
          Elige cómo vas a pagar
        </h3>
      </div>

      {methods.length === 0 ? (
        <p className="text-muted-foreground text-xs">Sin métodos de pago.</p>
      ) : (
        <FieldGroup className="gap-3">
          {methodPromotionHint ? (
            <p
              className="text-xs leading-snug text-emerald-800 dark:text-emerald-200"
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
              isZelle={selectedMethod.method_type === "zelle"}
              paymentReference={paymentReference}
              paymentPayerName={paymentPayerName}
              referenceMinLength={referenceMinLength}
              referenceInputMode={referenceInputMode}
              paymentProof={paymentProof}
              referenceHint={referenceHint}
              payerNameHint={payerNameHint}
              proofHint={proofHint}
              onPaymentReferenceChange={onPaymentReferenceChange}
              onPaymentPayerNameChange={onPaymentPayerNameChange}
              onPaymentProofChange={onPaymentProofChange}
            />
          ) : null}
        </FieldGroup>
      )}
    </section>
  )
})
