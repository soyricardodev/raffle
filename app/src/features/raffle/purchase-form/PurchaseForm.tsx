import { SpinnerGapIcon, TicketIcon } from "@phosphor-icons/react"
import {
  type CedulaPrefix,
  type CustomerLocationType,
  customerLocationFieldError,
  formatCustomerCi,
  formatCustomerLocation,
  isValidCustomerCi,
  isValidCustomerPhone,
  paymentReferenceValidationMessage,
  resolvePaymentReferenceInputMode,
  resolvePaymentReferencePolicy,
  sanitizePaymentReference,
  singleMunicipalityName,
} from "@raffle/shared/validators"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { homeQueryKeys } from "@/features/home/home-queries"
import { resolveSupportChannel } from "@/features/layout/social-links"
import { usePublicBranding } from "@/features/layout/use-public-branding"
import {
  loadSavedBuyerProfile,
  type SavedBuyerProfile,
  saveBuyerProfile,
} from "@/features/raffle/purchase-form/buyer-profile-storage"
import { CustomerDetailsStep } from "@/features/raffle/purchase-form/CustomerDetailsStep"
import {
  purchaseStepDividerClassName,
  purchaseSubmitButtonClassName,
} from "@/features/raffle/purchase-form/field-styles"
import { PaymentStep } from "@/features/raffle/purchase-form/PaymentStep"
import { PurchaseErrorSupportPanel } from "@/features/raffle/purchase-form/PurchaseErrorSupportPanel"
import { PurchaseSuccessDialog } from "@/features/raffle/purchase-form/PurchaseSuccessDialog"
import {
  buildPurchaseSupportHref,
  type PurchaseSupportErrorState,
  resolvePurchaseSupportError,
} from "@/features/raffle/purchase-form/purchase-error-support"
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
import { publicFetch } from "@/lib/admin-fetch"
import { getApiErrorMessage } from "@/lib/api-error-message"
import { formatCurrency } from "@/lib/format"

export type PurchaseFormProps = {
  raffle: RaffleForPurchase
  rememberBuyer?: boolean
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

export function PurchaseForm({ raffle, rememberBuyer = true }: PurchaseFormProps) {
  const queryClient = useQueryClient()
  const branding = usePublicBranding()
  const [supportError, setSupportError] = useState<PurchaseSupportErrorState | null>(null)
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
  const [locationType, setLocationType] = useState<CustomerLocationType>("venezuela")
  const [selectedState, setSelectedState] = useState("")
  const [selectedMunicipality, setSelectedMunicipality] = useState("")
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
  } = usePaymentMethodSelection(methods, quantity, available)

  const {
    priceCurrency,
    methodPromotionBadges,
    methodPromotionHint,
    total,
    unitPriceBs,
    discountPerTicketBs,
    totalBs,
    unitPriceUsd,
    totalUsd,
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
    setLocationType(profile.locationType)
    setSelectedState(profile.selectedState)
    setSelectedMunicipality(
      profile.selectedMunicipality || singleMunicipalityName(profile.selectedState) || "",
    )
    setCustomLocation(profile.customLocation)
  }, [])

  useEffect(() => {
    if (!rememberBuyer) return
    const saved = loadSavedBuyerProfile()
    if (!saved) return
    setSavedProfile(saved)
    applyProfile(saved)
  }, [applyProfile, rememberBuyer])

  useEffect(() => {
    setQuantity((current) => clampQuantity(current, quantityMin, effectiveMax))
  }, [quantityMin, effectiveMax])

  const { minLength: referenceMinLength, inputMode: referenceInputMode } = useMemo(
    () =>
      resolvePaymentReferencePolicy(
        selectedMethod?.method_type,
        selectedMethod?.min_reference_length,
      ),
    [selectedMethod?.method_type, selectedMethod?.min_reference_length],
  )

  const handlePaymentReferenceChange = useCallback(
    (value: string) => {
      setPaymentReference(sanitizePaymentReference(value, referenceInputMode))
    },
    [referenceInputMode],
  )

  const handleSelectPaymentMethod = useCallback(
    (id: number) => {
      const method = methods.find((m) => m.id === id)
      const nextMode = resolvePaymentReferenceInputMode(method?.method_type)
      setPaymentReference((current) => sanitizePaymentReference(current, nextMode))
      setRafflePaymentMethodId(id)
    },
    [methods, setRafflePaymentMethodId],
  )

  const validationMessages = useMemo<PurchaseFormHints>(
    () => ({
      name: !customerName.trim() ? "Ingresa tu nombre completo" : undefined,
      phone: !isValidCustomerPhone(customerPhone)
        ? "Teléfono inválido (ej: +58 412… o 0412…)"
        : undefined,
      email: emailHint(customerEmail),
      ci: ciHint(ciPrefix, ciNumber),
      location: customerLocationFieldError({
        locationType,
        selectedState,
        selectedMunicipality,
        customLocation,
        requireMunicipality: true,
      }),
      reference: paymentReferenceValidationMessage(
        paymentReference,
        referenceMinLength,
        referenceInputMode,
      ),
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
      customerEmail,
      ciPrefix,
      ciNumber,
      locationType,
      selectedState,
      selectedMunicipality,
      customLocation,
      paymentReference,
      referenceMinLength,
      referenceInputMode,
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

      const customerLocation = formatCustomerLocation({
        locationType,
        selectedState,
        selectedMunicipality,
        customLocation,
        requireMunicipality: true,
      })

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
      if (rememberBuyer) {
        saveBuyerProfile({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          ciPrefix,
          ciNumber,
          locationType,
          selectedState,
          selectedMunicipality,
          customLocation,
        })
        setSavedProfile({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          ciPrefix,
          ciNumber,
          locationType,
          selectedState,
          selectedMunicipality,
          customLocation,
          savedAt: Date.now(),
        })
        setSavedProfileDismissed(false)
      }
      setSuccessResult(result)
      setPaymentReference("")
      setRafflePaymentMethodId(null)
      setPaymentProof(null)
      setQuantity(quantityMin)
      setTouched(false)
      setSupportError(null)
      void queryClient.invalidateQueries({
        queryKey: raffleLiveQueryKeys.status(String(raffle.id)),
      })
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.display })
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.firstActive })
      void queryClient.invalidateQueries({ queryKey: raffleQueryKeys.detail(String(raffle.id)) })
    },
    onError: (error: unknown) => {
      const fallback = "No se pudo procesar la compra"
      const support = resolvePurchaseSupportError(error, fallback)
      const message = support?.message ?? getApiErrorMessage(error, fallback)
      toast.error(message)
      setSupportError(support)
      if (message.includes("método de pago") || message.includes("Método de pago")) {
        void queryClient.invalidateQueries({ queryKey: raffleQueryKeys.detail(String(raffle.id)) })
        void queryClient.invalidateQueries({ queryKey: homeQueryKeys.display })
        void queryClient.invalidateQueries({ queryKey: homeQueryKeys.firstActive })
      }
    },
  })

  const supportChannel = useMemo(
    () =>
      resolveSupportChannel({
        whatsappEnabled: branding?.whatsappEnabled ?? false,
        social: branding?.social,
        promo: branding?.purchaseSuccessPromo,
      }),
    [branding?.whatsappEnabled, branding?.social, branding?.purchaseSuccessPromo],
  )

  const supportHref = useMemo(() => {
    if (!supportError) return null
    return buildPurchaseSupportHref(supportChannel, supportError, {
      raffleId: raffle.id,
      raffleName: raffle.name,
      ticketQuantity: quantity,
      paymentMethodId: rafflePaymentMethodId,
      pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
    })
  }, [supportError, supportChannel, raffle.id, raffle.name, quantity, rafflePaymentMethodId])

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
    setLocationType("venezuela")
    setSelectedState("")
    setSelectedMunicipality("")
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
    setSupportError(null)
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
    <div className="space-y-3">
      <Card id="purchase-form" className="relative overflow-hidden py-4">
        {isSubmitting ? (
          <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
            <SpinnerGapIcon className="animate-spin" />
          </div>
        ) : null}
        <CardContent className="flex flex-col gap-4 pb-2">
          <TicketQuantityStep
            quantity={quantity}
            quantityMin={quantityMin}
            raffleMinPurchase={minPurchase}
            effectiveMax={effectiveMax}
            available={available}
            paymentThresholds={paymentThresholds}
            unitPrice={unitPriceBs}
            discountPerTicket={discountPerTicketBs > 0 ? discountPerTicketBs : undefined}
            unitPriceUsd={unitPriceUsd}
            totalBs={totalBs}
            totalUsd={totalUsd}
            currency="Bs"
            selloutFlex={quantityRange.selloutFlex}
            disabled={disabled}
            onChange={setQuantity}
          />

          <div className={purchaseStepDividerClassName} />

          <CustomerDetailsStep
            disabled={disabled}
            customerName={customerName}
            customerPhone={customerPhone}
            customerEmail={customerEmail}
            ciPrefix={ciPrefix}
            ciNumber={ciNumber}
            locationType={locationType}
            selectedState={selectedState}
            selectedMunicipality={selectedMunicipality}
            customLocation={customLocation}
            savedProfileName={savedProfile?.customerName ?? null}
            savedProfileDismissed={savedProfileDismissed}
            hints={customerHints}
            onCustomerNameChange={setCustomerName}
            onCustomerPhoneChange={setCustomerPhone}
            onCustomerEmailChange={setCustomerEmail}
            onCiPrefixChange={setCiPrefix}
            onCiNumberChange={setCiNumber}
            onLocationTypeChange={setLocationType}
            onSelectedStateChange={setSelectedState}
            onSelectedMunicipalityChange={setSelectedMunicipality}
            onCustomLocationChange={setCustomLocation}
            onUseOtherSavedData={handleUseOtherSavedData}
            onRestoreSavedProfile={handleRestoreSavedProfile}
          />

          <div className={purchaseStepDividerClassName} />

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
            referenceMinLength={referenceMinLength}
            referenceInputMode={referenceInputMode}
            paymentProof={paymentProof}
            methodHint={methodHint}
            referenceHint={referenceHint}
            proofHint={proofHint}
            getEligibility={getEligibility}
            onSelectMethod={handleSelectPaymentMethod}
            onPaymentReferenceChange={handlePaymentReferenceChange}
            onPaymentProofChange={setPaymentProof}
          />

          {supportError ? (
            <PurchaseErrorSupportPanel
              support={supportError}
              supportHref={supportHref}
              supportLabel={supportChannel.label}
              supportBrandColor={supportChannel.brandColor}
              supportKind={supportChannel.kind}
              isRetrying={isSubmitting}
              onRetry={() => purchaseMutation.mutate()}
            />
          ) : null}

          <div className="sticky bottom-0 z-20 -mx-6 border-t border-border/80 bg-background/95 px-6 py-3 backdrop-blur-sm sm:static sm:z-auto sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
            <Button
              size="lg"
              className={purchaseSubmitButtonClassName}
              data-testid="purchase-submit"
              data-pending={isSubmitting ? "true" : undefined}
              disabled={disabled || isSubmitting || methods.length === 0}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <SpinnerGapIcon data-icon="inline-start" className="animate-spin" />
                  Procesando…
                </>
              ) : (
                <span className="flex min-w-0 items-center justify-center gap-2.5">
                  <TicketIcon className="size-6 shrink-0" weight="fill" aria-hidden />
                  <span className="flex min-w-0 flex-col items-start leading-tight">
                    <span>Confirmar compra</span>
                    <span className="text-[13px] font-semibold tracking-normal opacity-95">
                      Recibe tus boletos · {formatCurrency(total, priceCurrency)}
                    </span>
                  </span>
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <PurchaseSuccessDialog
        result={successResult}
        verifyPhone={customerPhone.trim() || undefined}
        raffleImageUrl={raffle.image_url}
        onClose={() => setSuccessResult(null)}
      />
    </div>
  )
}
