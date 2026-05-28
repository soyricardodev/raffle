import { useMutation } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRaffleLiveDataOrFetch } from "@/features/raffle/raffle-live-context"
import {
  loadSavedBuyerProfile,
  saveBuyerProfile,
  type SavedBuyerProfile,
} from "@/features/raffle/purchase-form/buyer-profile-storage"
import { CustomerDetailsStep } from "@/features/raffle/purchase-form/CustomerDetailsStep"
import { PaymentStep } from "@/features/raffle/purchase-form/PaymentStep"
import { PurchaseSuccessDialog } from "@/features/raffle/purchase-form/PurchaseSuccessDialog"
import { TicketQuantityStep } from "@/features/raffle/purchase-form/TicketQuantityStep"
import { usePaymentMethodSelection } from "@/features/raffle/purchase-form/use-payment-method-selection"
import type { PurchaseResult, RaffleForPurchase, RafflePaymentMethod } from "@/features/raffle/types"
import { publicFetch } from "@/lib/admin-fetch"
import {
  type CedulaPrefix,
  type CustomerLocationType,
  customerLocationFieldError,
  formatCustomerCi,
  formatCustomerLocation,
  isDollarMethod,
  isValidCustomerCi,
  isValidCustomerPhone,
} from "@raffle/shared/validators"
import type { PhoneInputMode } from "@raffle/shared/validators"
import { SpinnerGapIcon } from "@phosphor-icons/react"

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

const EMPTY_HINTS: PurchaseFormHints = {}

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
  const minPurchase = Number(raffle.min_purchase) || 1
  const maxPurchase = Number(raffle.max_purchase) || 10

  const { data: live } = useRaffleLiveDataOrFetch(raffle.id, {
    enabled: raffle.status === "active" || raffle.status === "paused",
  })

  const available =
    live?.availability.available ?? (Number(raffle.tickets_available) || 0)
  const isPaused = live?.isPaused ?? raffle.status === "paused"
  const effectiveMax = Math.min(maxPurchase, available)

  const methods = useMemo(
    () => activePaymentMethods(raffle.payment_methods),
    [raffle.payment_methods],
  )

  const [quantity, setQuantity] = useState(minPurchase)
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
  const [hasSavedProfile, setHasSavedProfile] = useState(false)

  const {
    selectedId: rafflePaymentMethodId,
    setSelectedId: setRafflePaymentMethodId,
    selectedMethod,
    selectedBlockedReason,
    getEligibility,
  } = usePaymentMethodSelection(methods, quantity)

  const total = useMemo(() => {
    if (!selectedMethod) return 0
    const unit = isDollarMethod(selectedMethod.method_type)
      ? Number(raffle.price_usd)
      : Number(raffle.price_bs)
    return unit * quantity
  }, [selectedMethod, quantity, raffle.price_bs, raffle.price_usd])

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
    setHasSavedProfile(saved != null)
  }, [])

  const validationMessages = useMemo<PurchaseFormHints>(
    () => ({
      name: !customerName.trim() ? "Ingresa tu nombre completo" : undefined,
      phone: !isValidCustomerPhone(customerPhone, phoneMode)
        ? phoneMode === "international"
          ? "Usa formato internacional (+código y número)"
          : "Teléfono venezolano inválido (ej: 04121234567)"
        : undefined,
      email: emailHint(customerEmail),
      ci: ciHint(ciPrefix, ciNumber),
      location: customerLocationFieldError(locationType, selectedState, customLocation),
      reference: !paymentReference.trim() ? "Ingresa la referencia de pago" : undefined,
      proof: !paymentProof ? "Sube el comprobante de pago" : undefined,
      method: !rafflePaymentMethodId
        ? "Elige un método de pago"
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
      paymentProof,
      rafflePaymentMethodId,
      selectedBlockedReason,
    ],
  )

  const hints = touched ? validationMessages : EMPTY_HINTS

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!rafflePaymentMethodId) throw new Error("Selecciona un método de pago")
      if (!paymentProof) throw new Error("Sube el comprobante de pago")

      const customerLocation = formatCustomerLocation(
        locationType,
        selectedState,
        customLocation,
      )

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
      setHasSavedProfile(true)
      setSuccessResult(result)
      setPaymentReference("")
      setRafflePaymentMethodId(null)
      setPaymentProof(null)
      setQuantity(minPurchase)
      setTouched(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const disabled =
    raffle.status !== "active" ||
    isPaused ||
    available <= 0 ||
    purchaseMutation.isPending ||
    effectiveMax < minPurchase

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

  function handleApplySavedProfile() {
    const saved = loadSavedBuyerProfile()
    if (!saved) return
    applyProfile(saved)
    toast.success("Datos cargados")
  }

  const isSubmitting = purchaseMutation.isPending

  return (
    <>
      <Card className="relative overflow-hidden">
        {isSubmitting ? (
          <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
            <SpinnerGapIcon className="animate-spin" />
          </div>
        ) : null}
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Comprar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TicketQuantityStep
            quantity={quantity}
            minPurchase={minPurchase}
            effectiveMax={effectiveMax}
            available={available}
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
            hasSavedProfile={hasSavedProfile}
            hints={hints}
            onCustomerNameChange={setCustomerName}
            onCustomerPhoneChange={setCustomerPhone}
            onCustomerEmailChange={setCustomerEmail}
            onCiPrefixChange={setCiPrefix}
            onCiNumberChange={setCiNumber}
            onPhoneModeChange={setPhoneMode}
            onLocationTypeChange={setLocationType}
            onSelectedStateChange={setSelectedState}
            onCustomLocationChange={setCustomLocation}
            onApplySavedProfile={handleApplySavedProfile}
          />

          <PaymentStep
            methods={methods}
            quantity={quantity}
            disabled={disabled}
            selectedId={rafflePaymentMethodId}
            selectedMethod={selectedMethod}
            total={total}
            paymentReference={paymentReference}
            paymentProof={paymentProof}
            methodHint={hints.method}
            referenceHint={hints.reference}
            proofHint={hints.proof}
            getEligibility={getEligibility}
            onSelectMethod={setRafflePaymentMethodId}
            onPaymentReferenceChange={setPaymentReference}
            onPaymentProofChange={setPaymentProof}
          />

          <Button
            className="w-full"
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
              "Confirmar compra"
            )}
          </Button>
        </CardContent>
      </Card>

      <PurchaseSuccessDialog
        result={successResult}
        onClose={() => setSuccessResult(null)}
      />
    </>
  )
}
