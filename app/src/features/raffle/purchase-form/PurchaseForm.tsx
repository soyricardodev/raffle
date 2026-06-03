import { SpinnerGapIcon } from "@phosphor-icons/react"
import type { PhoneInputMode } from "@raffle/shared/validators"
import {
  type CedulaPrefix,
  type CustomerLocationType,
  customerLocationFieldError,
  formatCustomerCi,
  formatCustomerLocation,
  isValidCustomerCi,
  isValidCustomerPhone,
  paymentReferenceValidationMessage,
  resolvePaymentReferenceMinLength,
} from "@raffle/shared/validators"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  loadSavedBuyerProfile,
  type SavedBuyerProfile,
  saveBuyerProfile,
} from "@/features/raffle/purchase-form/buyer-profile-storage"
import { CustomerDetailsStep } from "@/features/raffle/purchase-form/CustomerDetailsStep"
import { PaymentStep } from "@/features/raffle/purchase-form/PaymentStep"
import { PurchaseSuccessDialog } from "@/features/raffle/purchase-form/PurchaseSuccessDialog"
import { TicketQuantityStep } from "@/features/raffle/purchase-form/TicketQuantityStep"
import {
  clampQuantity,
  getPaymentMethodThresholds,
  getPurchasableQuantityRange,
} from "@/features/raffle/purchase-form/ticket-quantity-utils"
import { usePaymentMethodSelection } from "@/features/raffle/purchase-form/use-payment-method-selection"
import { usePurchasePricing } from "@/features/raffle/purchase-form/use-purchase-pricing"
import { useRaffleLiveDataOrFetch } from "@/features/raffle/raffle-live-context"
import { raffleLiveQueryKeys } from "@/features/raffle/raffle-live-queries"
import { raffleQueryKeys } from "@/features/raffle/raffle-queries"
import type {
  PurchaseResult,
  RaffleForPurchase,
  RafflePaymentMethod,
} from "@/features/raffle/types"
import { useBuyerPresence } from "@/features/raffle/use-buyer-presence"
import { getApiErrorMessage, publicFetch } from "@/lib/admin-fetch"
import { formatCurrency } from "@/lib/format"

export type PurchaseFormProps = {
  raffle: RaffleForPurchase
}

type PurchaseFormHints = {
  name?: string
  phone?: string
  email?: string
  ci?: string
  location?: string
  reference?: string
  proof?: string
  method?: string
}

type CustomerHints = Pick<PurchaseFormHints, "name" | "phone" | "email" | "ci" | "location">

const EMPTY_HINTS: PurchaseFormHints = {}
const EMPTY_CUSTOMER_HINTS: CustomerHints = {}

function activePaymentMethods(raw: RafflePaymentMethod[] | undefined): RafflePaymentMethod[] {
  return (raw ?? []).filter((m) => m.is_active !== false && m.id > 0)
}

function emailHint(email: string): string | undefined {
  const trimmed = email.trim()
  if (!trimmed) return "Ingresa tu email"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Email inválido"
  return undefined
}

function ciHint(prefix: CedulaPrefix, number: string): string | undefined {
  if (!number.trim()) return "Ingresa tu cédula"
  const formatted = formatCustomerCi(prefix, number)
  if (!isValidCustomerCi(formatted)) return "Cédula inválida"
  return undefined
}

export function PurchaseForm({ raffle }: PurchaseFormProps) {
  const queryClient = useQueryClient()
  const minPurchase = Number(raffle.min_purchase) || 1
  const maxPurchase = Number(raffle.max_purchase) || 10

  const { data: live } = useRaffleLiveDataOrFetch(raffle.id, {
    enabled: raffle.status === "active" || raffle.status === "paused",
  })

  const available = live?.availability.available ?? (Number(raffle.tickets_available) || 0)
  const isPaused = live?.isPaused ?? raffle.status === "paused"

  const methods = useMemo(
    () => activePaymentMethods(raffle.payment_methods),
    [raffle.payment_methods],
  )

  const quantityRange = useMemo(
    () => getPurchasableQuantityRange(minPurchase, maxPurchase, available, methods),
    [minPurchase, maxPurchase, available, methods],
  )
  const quantityMin = quantityRange.min
  const effectiveMax = quantityRange.max

  const paymentThresholds = useMemo(() => getPaymentMethodThresholds(methods), [methods])

  const [quantity, setQuantity] = useState(quantityMin)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [ciPrefix, setCiPrefix] = useState<CedulaPrefix>("V")
  const [ciNumber, setCiNumber] = useState("")
  const [phoneMode, setPhoneMode] = useState<PhoneInputMode>("venezuela")
  const [locationType, setLocationType] = useState<CustomerLocationType>("venezuela")
  const [selectedState, setSelectedState] = useState("")
  const [customLocation, setCustomLocation] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [successResult, setSuccessResult] = useState<PurchaseResult | null>(null)
  const [touched, setTouched] = useState(false)
  const [savedProfile, setSavedProfile] = useState<SavedBuyerProfile | null>(null)
  const [savedProfileDismissed, setSavedProfileDismissed] = useState(false)

  const {
    selectedId: rafflePaymentMethodId,
    setSelectedId: setRafflePaymentMethodId,
    selectedMethod,
    selectedBlockedReason,
    getEligibility,
  } = usePaymentMethodSelection(methods, quantity)

  const {
    unitPrice,
    originalUnitPrice,
    discountPerTicket,
    priceCurrency,
    priceIsEstimate,
    methodPromotionBadges,
    methodPromotionHint,
    total,
  } = usePurchasePricing({
    raffle,
    quantity,
    selectedMethod,
  })

  const customerCi = useMemo(
    () => (ciNumber ? formatCustomerCi(ciPrefix, ciNumber) : ""),
    [ciPrefix, ciNumber],
  )

  const applyProfile = useCallback((profile: SavedBuyerProfile) => {
    setCustomerName(profile.customerName)
    setCustomerPhone(profile.customerPhone)
    setCustomerEmail(profile.customerEmail)
    setCiPrefix(profile.ciPrefix)
    setCiNumber(profile.ciNumber)
    setPhoneMode(profile.phoneMode)
    setLocationType(profile.locationType)
    setSelectedState(profile.selectedState)
    setCustomLocation(profile.customLocation)
  }, [])

  useEffect(() => {
    const saved = loadSavedBuyerProfile()
    if (!saved) return
    setSavedProfile(saved)
    applyProfile(saved)
  }, [applyProfile])

  useEffect(() => {
    setQuantity((current) => clampQuantity(current, quantityMin, effectiveMax))
  }, [quantityMin, effectiveMax])

  const referenceMinLength = useMemo(
    () => resolvePaymentReferenceMinLength(selectedMethod?.min_reference_length),
    [selectedMethod?.min_reference_length],
  )

  const validationMessages = useMemo<PurchaseFormHints>(
    () => ({
      name: !customerName.trim() ? "Ingresa tu nombre completo" : undefined,
      phone: !isValidCustomerPhone(customerPhone, phoneMode)
        ? phoneMode === "other"
          ? "Usa formato internacional (+código y número)"
          : "Teléfono venezolano inválido (ej: 04121234567)"
        : undefined,
      email: emailHint(customerEmail),
      ci: ciHint(ciPrefix, ciNumber),
      location: customerLocationFieldError(locationType, selectedState, customLocation),
      reference: paymentReferenceValidationMessage(paymentReference, referenceMinLength),
      proof: !paymentProof ? "Sube el comprobante de pago" : undefined,
      method: !rafflePaymentMethodId
        ? "Elige un método de pago"
        : !methods.some((m) => m.id === rafflePaymentMethodId)
          ? "Este método ya no está disponible. Elige otro."
          : selectedBlockedReason,
    }),
    [
      customerName,
      customerPhone,
      phoneMode,
      customerEmail,
      ciPrefix,
      ciNumber,
      locationType,
      selectedState,
      customLocation,
      paymentReference,
      referenceMinLength,
      paymentProof,
      rafflePaymentMethodId,
      selectedBlockedReason,
      methods,
    ],
  )

  const customerHints = useMemo<CustomerHints>(() => {
    if (!touched) return EMPTY_CUSTOMER_HINTS
    return {
      name: validationMessages.name,
      phone: validationMessages.phone,
      email: validationMessages.email,
      ci: validationMessages.ci,
      location: validationMessages.location,
    }
  }, [
    touched,
    validationMessages.name,
    validationMessages.phone,
    validationMessages.email,
    validationMessages.ci,
    validationMessages.location,
  ])

  const methodHint = touched ? validationMessages.method : EMPTY_HINTS.method
  const referenceHint = touched ? validationMessages.reference : EMPTY_HINTS.reference
  const proofHint = touched ? validationMessages.proof : EMPTY_HINTS.proof

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!rafflePaymentMethodId) throw new Error("Selecciona un método de pago")
      if (!paymentProof) throw new Error("Sube el comprobante de pago")

      const customerLocation = formatCustomerLocation(locationType, selectedState, customLocation)

      const form = new FormData()
      form.append("raffleId", String(raffle.id))
      form.append("customerName", customerName.trim())
      form.append("customerPhone", customerPhone.trim())
      form.append("customerEmail", customerEmail.trim())
      form.append("customerCi", customerCi)
      form.append("customerLocation", customerLocation)
      form.append("rafflePaymentMethodId", String(rafflePaymentMethodId))
      form.append("paymentReference", paymentReference.trim())
      form.append("ticketQuantity", String(quantity))
      form.append("paymentProof", paymentProof)

      return publicFetch<PurchaseResult>("/api/purchases/", { method: "POST", body: form })
    },
    onSuccess: (result) => {
      saveBuyerProfile({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        ciPrefix,
        ciNumber,
        phoneMode,
        locationType,
        selectedState,
        customLocation,
      })
      setSavedProfile({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        ciPrefix,
        ciNumber,
        phoneMode,
        locationType,
        selectedState,
        customLocation,
        savedAt: Date.now(),
      })
      setSavedProfileDismissed(false)
      setSuccessResult(result)
      setPaymentReference("")
      setRafflePaymentMethodId(null)
      setPaymentProof(null)
      setQuantity(quantityMin)
      setTouched(false)
      void queryClient.invalidateQueries({
        queryKey: raffleLiveQueryKeys.status(String(raffle.id)),
      })
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, "No se pudo procesar la compra")
      toast.error(message)
      if (message.includes("método de pago") || message.includes("Método de pago")) {
        void queryClient.invalidateQueries({ queryKey: raffleQueryKeys.detail(String(raffle.id)) })
        void queryClient.invalidateQueries({ queryKey: ["raffle", "first-active"] })
      }
    },
  })

  const disabled =
    raffle.status !== "active" ||
    isPaused ||
    purchaseMutation.isPending ||
    !quantityRange.hasPurchasableQuantity

  useBuyerPresence({
    raffleId: raffle.id,
    enabled: raffle.status === "active" && !isPaused && available > 0,
  })

  const clearCustomerFields = useCallback(() => {
    setCustomerName("")
    setCustomerPhone("")
    setCustomerEmail("")
    setCiPrefix("V")
    setCiNumber("")
    setPhoneMode("venezuela")
    setLocationType("venezuela")
    setSelectedState("")
    setCustomLocation("")
  }, [])

  const handleUseOtherSavedData = useCallback(() => {
    clearCustomerFields()
    setSavedProfileDismissed(true)
  }, [clearCustomerFields])

  const handleRestoreSavedProfile = useCallback(() => {
    if (!savedProfile) return
    applyProfile(savedProfile)
    setSavedProfileDismissed(false)
  }, [savedProfile, applyProfile])

  if (raffle.status === "finished") {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="font-medium">Esta rifa ya finalizó</p>
          <p className="text-muted-foreground mt-1 text-sm">Gracias por participar.</p>
        </CardContent>
      </Card>
    )
  }

  function handleSubmit() {
    setTouched(true)
    if (
      validationMessages.name ||
      validationMessages.phone ||
      validationMessages.email ||
      validationMessages.ci ||
      validationMessages.location ||
      validationMessages.reference ||
      validationMessages.proof ||
      validationMessages.method
    ) {
      return
    }
    purchaseMutation.mutate()
  }

  const isSubmitting = purchaseMutation.isPending

  return (
    <>
      <Card id="purchase-form" className="relative overflow-hidden">
        {isSubmitting ? (
          <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
            <SpinnerGapIcon className="animate-spin" />
          </div>
        ) : null}
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg">Compra tus boletos</CardTitle>
              <p className="text-muted-foreground mt-1 text-xs leading-snug">
                <span className="text-foreground font-medium tabular-nums">{quantity}</span> boleto
                {quantity === 1 ? "" : "s"} · completa los 3 pasos
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                Total
              </p>
              <p className="font-serif text-xl font-bold tabular-nums">
                {formatCurrency(total, priceCurrency)}
              </p>
              {priceIsEstimate ? (
                <Badge variant="outline" className="mt-1 text-[10px]">
                  Estimado
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pb-2">
          <TicketQuantityStep
            quantity={quantity}
            quantityMin={quantityMin}
            raffleMinPurchase={minPurchase}
            effectiveMax={effectiveMax}
            available={available}
            paymentThresholds={paymentThresholds}
            unitPrice={unitPrice}
            originalUnitPrice={discountPerTicket > 0 ? originalUnitPrice : undefined}
            discountPerTicket={discountPerTicket > 0 ? discountPerTicket : undefined}
            currency={priceCurrency}
            priceIsEstimate={priceIsEstimate}
            disabled={disabled}
            onChange={setQuantity}
          />

          <CustomerDetailsStep
            disabled={disabled}
            customerName={customerName}
            customerPhone={customerPhone}
            customerEmail={customerEmail}
            ciPrefix={ciPrefix}
            ciNumber={ciNumber}
            phoneMode={phoneMode}
            locationType={locationType}
            selectedState={selectedState}
            customLocation={customLocation}
            savedProfileName={savedProfile?.customerName ?? null}
            savedProfileDismissed={savedProfileDismissed}
            hints={customerHints}
            onCustomerNameChange={setCustomerName}
            onCustomerPhoneChange={setCustomerPhone}
            onCustomerEmailChange={setCustomerEmail}
            onCiPrefixChange={setCiPrefix}
            onCiNumberChange={setCiNumber}
            onPhoneModeChange={setPhoneMode}
            onLocationTypeChange={setLocationType}
            onSelectedStateChange={setSelectedState}
            onCustomLocationChange={setCustomLocation}
            onUseOtherSavedData={handleUseOtherSavedData}
            onRestoreSavedProfile={handleRestoreSavedProfile}
          />

          <PaymentStep
            methods={methods}
            quantity={quantity}
            disabled={disabled}
            selectedId={rafflePaymentMethodId}
            selectedMethod={selectedMethod}
            methodPromotionBadges={methodPromotionBadges}
            methodPromotionHint={methodPromotionHint}
            total={total}
            paymentReference={paymentReference}
            paymentProof={paymentProof}
            methodHint={methodHint}
            referenceHint={referenceHint}
            proofHint={proofHint}
            getEligibility={getEligibility}
            onSelectMethod={setRafflePaymentMethodId}
            onPaymentReferenceChange={setPaymentReference}
            onPaymentProofChange={setPaymentProof}
          />

          <div className="sticky bottom-0 z-20 -mx-6 border-t border-border/80 bg-background/95 px-6 py-3 backdrop-blur-sm sm:static sm:z-auto sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
            <Button
              size="lg"
              className="h-12 w-full text-base font-semibold shadow-md sm:h-10 sm:text-sm sm:shadow-none"
              data-testid="purchase-submit"
              disabled={disabled || isSubmitting || methods.length === 0}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <SpinnerGapIcon data-icon="inline-start" className="animate-spin" />
                  Procesando…
                </>
              ) : (
                <>
                  Confirmar compra
                  <span className="opacity-90">· {formatCurrency(total, priceCurrency)}</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <PurchaseSuccessDialog
        result={successResult}
        raffleImageUrl={raffle.image_url}
        onClose={() => setSuccessResult(null)}
      />
    </>
  )
}
