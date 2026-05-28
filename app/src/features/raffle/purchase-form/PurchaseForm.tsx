import { useMutation } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useRaffleLiveDataOrFetch } from "@/features/raffle/raffle-live-context"
import { CustomerDetailsStep } from "@/features/raffle/purchase-form/CustomerDetailsStep"
import { PaymentStep } from "@/features/raffle/purchase-form/PaymentStep"
import { PurchaseSuccessDialog } from "@/features/raffle/purchase-form/PurchaseSuccessDialog"
import { TicketQuantityStep } from "@/features/raffle/purchase-form/TicketQuantityStep"
import { usePaymentMethodSelection } from "@/features/raffle/purchase-form/use-payment-method-selection"
import type { PurchaseResult, RaffleForPurchase, RafflePaymentMethod } from "@/features/raffle/types"
import { publicFetch } from "@/lib/admin-fetch"
import {
  type CustomerLocationType,
  customerLocationFieldError,
  formatCustomerLocation,
  isDollarMethod,
} from "@raffle/shared/validators"
import { Loader2 } from "lucide-react"

export type PurchaseFormProps = {
  raffle: RaffleForPurchase
}

function activePaymentMethods(raw: RafflePaymentMethod[] | undefined): RafflePaymentMethod[] {
  return (raw ?? []).filter((m) => m.is_active !== false && m.id > 0)
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
  const [customerCi, setCustomerCi] = useState("")
  const [locationType, setLocationType] = useState<CustomerLocationType>("venezuela")
  const [selectedState, setSelectedState] = useState("")
  const [customLocation, setCustomLocation] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [successResult, setSuccessResult] = useState<PurchaseResult | null>(null)
  const [touched, setTouched] = useState(false)

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

  const hints = useMemo(() => {
    if (!touched) return {}
    return {
      name: !customerName.trim() ? "Ingresa tu nombre completo" : undefined,
      phone: !customerPhone.trim() ? "Ingresa tu teléfono" : undefined,
      location: customerLocationFieldError(locationType, selectedState, customLocation),
      reference: !paymentReference.trim() ? "Ingresa la referencia de pago" : undefined,
      method: !rafflePaymentMethodId
        ? "Elige un método de pago"
        : selectedBlockedReason,
    }
  }, [
    touched,
    customerName,
    customerPhone,
    locationType,
    selectedState,
    customLocation,
    paymentReference,
    rafflePaymentMethodId,
    selectedBlockedReason,
  ])

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!rafflePaymentMethodId) throw new Error("Selecciona un método de pago")

      const customerLocation = formatCustomerLocation(
        locationType,
        selectedState,
        customLocation,
      )

      const form = new FormData()
      form.append("raffleId", String(raffle.id))
      form.append("customerName", customerName.trim())
      form.append("customerPhone", customerPhone.trim())
      if (customerEmail.trim()) form.append("customerEmail", customerEmail.trim())
      if (customerCi.trim()) form.append("customerCi", customerCi.trim())
      form.append("customerLocation", customerLocation)
      form.append("rafflePaymentMethodId", String(rafflePaymentMethodId))
      form.append("paymentReference", paymentReference.trim())
      form.append("ticketQuantity", String(quantity))
      if (paymentProof) form.append("paymentProof", paymentProof)

      return publicFetch<PurchaseResult>("/api/purchases/", { method: "POST", body: form })
    },
    onSuccess: (result) => {
      setSuccessResult(result)
      setCustomerName("")
      setCustomerPhone("")
      setCustomerEmail("")
      setCustomerCi("")
      setLocationType("venezuela")
      setSelectedState("")
      setCustomLocation("")
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
    if (hints.name || hints.phone || hints.location || hints.reference || hints.method) return
    purchaseMutation.mutate()
  }

  const isSubmitting = purchaseMutation.isPending

  return (
    <>
      <Card className="relative overflow-hidden">
        {isSubmitting ? (
          <div className="bg-background/80 absolute inset-0 z-10 flex flex-col gap-3 p-6 backdrop-blur-sm">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Registrando tu compra…
            </p>
          </div>
        ) : null}
        <CardHeader>
          <CardTitle>Comprar boletos</CardTitle>
          <p className="text-muted-foreground text-sm">
            Completa los pasos. Te mostraremos tus números al finalizar.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
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
            customerCi={customerCi}
            locationType={locationType}
            selectedState={selectedState}
            customLocation={customLocation}
            hints={hints}
            onCustomerNameChange={setCustomerName}
            onCustomerPhoneChange={setCustomerPhone}
            onCustomerEmailChange={setCustomerEmail}
            onCustomerCiChange={setCustomerCi}
            onLocationTypeChange={setLocationType}
            onSelectedStateChange={setSelectedState}
            onCustomLocationChange={setCustomLocation}
          />

          <PaymentStep
            methods={methods}
            quantity={quantity}
            disabled={disabled}
            selectedId={rafflePaymentMethodId}
            selectedMethod={selectedMethod}
            total={total}
            paymentReference={paymentReference}
            methodHint={hints.method}
            referenceHint={hints.reference}
            getEligibility={getEligibility}
            onSelectMethod={setRafflePaymentMethodId}
            onPaymentReferenceChange={setPaymentReference}
            onPaymentProofChange={setPaymentProof}
          />

          <Button
            className="min-h-12 w-full text-base"
            size="lg"
            data-testid="purchase-submit"
            disabled={disabled || isSubmitting || methods.length === 0}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
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
