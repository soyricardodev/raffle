import {
  paymentMethodCurrencyLabel,
  paymentMethodDisplayLabel,
} from "@raffle/shared/payment-methods"
import { CheckCircleIcon, LockKeyIcon, ReceiptIcon } from "@phosphor-icons/react"
import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import type { MethodEligibility } from "@/features/raffle/payment-method-eligibility"
import { PaymentDetailsPanel } from "@/features/raffle/purchase-form/PaymentDetailsPanel"
import { PaymentProofUpload } from "@/features/raffle/purchase-form/PaymentProofUpload"
import { PaymentReferenceField } from "@/features/raffle/purchase-form/PaymentReferenceField"
import {
  paymentCompletionBoxClassName,
  paymentMethodCardActiveClassName,
  paymentMethodCardInactiveClassName,
  paymentMethodCardPromoClassName,
  paymentSectionCardClassName,
} from "@/features/raffle/purchase-form/field-styles"
import { resolvePaymentReferenceMinLength } from "@raffle/shared/validators"
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
  getEligibility: (method: RafflePaymentMethod) => MethodEligibility
  onSelectMethod: (id: number) => void
}

const PaymentMethodPicker = memo(function PaymentMethodPicker({
  methods,
  disabled,
  selectedId,
  methodPromotionBadges = {},
  methodHint,
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
          const promoBadge = methodPromotionBadges[method.id]

          return (
            // biome-ignore lint/a11y/useSemanticElements: These custom radio cards preserve the existing large mobile tap target.
            <button
              key={`rpm-${method.id}`}
              type="button"
              role="radio"
              aria-checked={active}
              data-testid={`payment-method-${method.id}`}
              disabled={disabled || locked}
              onClick={() => onSelectMethod(method.id)}
              className={cn(
                "group flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left shadow-sm transition-all focus-visible:border-emerald-500 focus-visible:ring-[3px] focus-visible:ring-emerald-500/40",
                active ? paymentMethodCardActiveClassName : paymentMethodCardInactiveClassName,
                promoBadge && !active && paymentMethodCardPromoClassName,
                locked && "cursor-not-allowed opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  active
                    ? "border-white/90 bg-white/20"
                    : "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                )}
                aria-hidden
              >
                {active ? (
                  <CheckCircleIcon weight="fill" className="text-white" />
                ) : (
                  <span className="size-3 rounded-full bg-emerald-500" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">{title}</span>
                <span
                  className={cn(
                    "block text-xs",
                    active ? "text-white/85" : "text-muted-foreground",
                  )}
                >
                  Paga en {currency}
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                {active ? (
                  <Badge className="border-0 bg-white/20 text-white hover:bg-white/20">
                    Seleccionado
                  </Badge>
                ) : null}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    active && "border-white/35 bg-white/10 text-white",
                    !active && "border-emerald-500/35 text-emerald-800 dark:text-emerald-200",
                  )}
                >
                  {currency}
                </Badge>
                {promoBadge ? (
                  <Badge
                    className="shrink-0 bg-emerald-600 text-[10px] font-semibold text-white tabular-nums hover:bg-emerald-600"
                    title="Promoción exclusiva de este método"
                  >
                    {promoBadge}
                  </Badge>
                ) : null}
                {locked ? (
                  <span className="text-destructive flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px]">
                    <LockKeyIcon />
                    Mínimo {minTickets} boletos
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
      <FieldError>{methodHint}</FieldError>
    </Field>
  )
})

type PaymentCompletionFieldsProps = {
  disabled: boolean
  paymentReference: string
  referenceMinLength: number
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
  paymentProof,
  referenceHint,
  proofHint,
  onPaymentReferenceChange,
  onPaymentProofChange,
}: PaymentCompletionFieldsProps) {
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
            Paso final: indica los últimos dígitos de la referencia y sube el comprobante para
            validar tu compra.
          </p>
        </div>
      </div>

      <PaymentReferenceField
        value={paymentReference}
        minLength={referenceMinLength}
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
  paymentProof,
  methodHint,
  referenceHint,
  proofHint,
  getEligibility,
  onSelectMethod,
  onPaymentReferenceChange,
  onPaymentProofChange,
}: PaymentStepProps) {
  const referenceMinLength = resolvePaymentReferenceMinLength(
    selectedMethod?.min_reference_length,
  )

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
            getEligibility={getEligibility}
            onSelectMethod={onSelectMethod}
          />

          {selectedMethod ? (
            <>
              <PaymentDetailsPanel method={selectedMethod} total={total} quantity={quantity} />
              <PaymentCompletionFields
                disabled={disabled}
                paymentReference={paymentReference}
                referenceMinLength={referenceMinLength}
                paymentProof={paymentProof}
                referenceHint={referenceHint}
                proofHint={proofHint}
                onPaymentReferenceChange={onPaymentReferenceChange}
                onPaymentProofChange={onPaymentProofChange}
              />
            </>
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
