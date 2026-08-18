import { EnvelopeSimpleIcon, UserCircleIcon } from "@phosphor-icons/react"
import {
  customerLocationFieldError,
  formatCustomerCi,
  formatCustomerLocation,
  isValidCustomerCi,
  isValidCustomerPhone,
  parseCustomerCi,
  type CedulaPrefix,
  type CustomerLocationType,
} from "@raffle/shared/validators"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { parsePurchaseLocationFormState } from "@/features/admin/purchases/parse-purchase-location"
import type { PurchaseDetail } from "@/features/admin/purchases/types"
import { CiInputField } from "@/features/raffle/purchase-form/CiInputField"
import { LabeledIconField } from "@/features/raffle/purchase-form/LabeledIconField"
import { LocationFields } from "@/features/raffle/purchase-form/LocationFields"
import { PhoneInputField } from "@/features/raffle/purchase-form/PhoneInputField"
import { usePublicBranding } from "@/features/layout/use-public-branding"
import { cn } from "@/lib/utils"

const SHEET_WIDTH_CLASS =
  "z-[60] !w-full !max-w-full sm:!w-[min(96vw,28rem)] md:!w-[min(92vw,40rem)] lg:!w-[min(88vw,44rem)] sm:!max-w-[min(96vw,28rem)] md:!max-w-[min(92vw,40rem)] lg:!max-w-[min(88vw,44rem)]"

const SHEET_LAYOUT_CLASS = "flex h-dvh max-h-dvh flex-col gap-0 overflow-hidden p-0"

function ciPartsFromStored(ci: string | null | undefined): { prefix: CedulaPrefix; number: string } {
  const parsed = parseCustomerCi(ci?.trim() ?? "")
  if (parsed) return parsed
  return { prefix: "V", number: "" }
}

export type EditPurchaseCustomerPayload = {
  customerName: string
  customerPhone: string
  customerEmail: string
  customerCi: string
  customerLocation: string
}

type EditPurchaseCustomerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchase: PurchaseDetail
  pending?: boolean
  onSave: (payload: EditPurchaseCustomerPayload) => void
}

export function EditPurchaseCustomerSheet({
  open,
  onOpenChange,
  purchase,
  pending = false,
  onSave,
}: EditPurchaseCustomerSheetProps) {
  const requireMunicipality = usePublicBranding()?.venezuelaMunicipalityEnabled ?? false
  const [customerName, setCustomerName] = useState(purchase.customer_name)
  const [customerPhone, setCustomerPhone] = useState(purchase.customer_phone)
  const [customerEmail, setCustomerEmail] = useState(purchase.customer_email?.trim() ?? "")
  const initialCi = ciPartsFromStored(purchase.customer_ci)
  const [ciPrefix, setCiPrefix] = useState<CedulaPrefix>(initialCi.prefix)
  const [ciNumber, setCiNumber] = useState(initialCi.number)
  const initialLocation = parsePurchaseLocationFormState(purchase.customer_location)
  const [locationType, setLocationType] = useState<CustomerLocationType>(initialLocation.locationType)
  const [selectedState, setSelectedState] = useState(initialLocation.selectedState)
  const [selectedMunicipality, setSelectedMunicipality] = useState(
    initialLocation.selectedMunicipality,
  )
  const [customLocation, setCustomLocation] = useState(initialLocation.customLocation)

  const [nameHint, setNameHint] = useState<string | undefined>()
  const [emailHint, setEmailHint] = useState<string | undefined>()
  const [phoneHint, setPhoneHint] = useState<string | undefined>()
  const [ciHint, setCiHint] = useState<string | undefined>()
  const [locationHint, setLocationHint] = useState<string | undefined>()

  useEffect(() => {
    if (!open) return
    setCustomerName(purchase.customer_name)
    setCustomerPhone(purchase.customer_phone)
    setCustomerEmail(purchase.customer_email?.trim() ?? "")
    const ci = ciPartsFromStored(purchase.customer_ci)
    setCiPrefix(ci.prefix)
    setCiNumber(ci.number)
    const loc = parsePurchaseLocationFormState(purchase.customer_location)
    setLocationType(loc.locationType)
    setSelectedState(loc.selectedState)
    setSelectedMunicipality(loc.selectedMunicipality)
    setCustomLocation(loc.customLocation)
    setNameHint(undefined)
    setEmailHint(undefined)
    setPhoneHint(undefined)
    setCiHint(undefined)
    setLocationHint(undefined)
  }, [
    open,
    purchase.customer_name,
    purchase.customer_phone,
    purchase.customer_email,
    purchase.customer_ci,
    purchase.customer_location,
  ])

  const formattedCi = ciNumber.trim() ? formatCustomerCi(ciPrefix, ciNumber) : ""
  const customerLocation = formatCustomerLocation({
    locationType,
    selectedState,
    selectedMunicipality,
    customLocation,
    requireMunicipality,
  })

  const nameValid = customerName.trim().length > 0
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
  const phoneValid = isValidCustomerPhone(customerPhone)
  const ciValid = formattedCi.length > 0 && isValidCustomerCi(formattedCi)
  const locationValid = !customerLocationFieldError({
    locationType,
    selectedState,
    selectedMunicipality,
    customLocation,
    requireMunicipality,
  })

  const snapshot: EditPurchaseCustomerPayload = {
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    customerEmail: customerEmail.trim(),
    customerCi: formattedCi,
    customerLocation,
  }

  const storedSnapshot: EditPurchaseCustomerPayload = {
    customerName: purchase.customer_name.trim(),
    customerPhone: purchase.customer_phone.trim(),
    customerEmail: purchase.customer_email?.trim() ?? "",
    customerCi: purchase.customer_ci?.trim() ?? "",
    customerLocation: purchase.customer_location?.trim() ?? "",
  }

  const hasChanges =
    snapshot.customerName !== storedSnapshot.customerName ||
    snapshot.customerPhone !== storedSnapshot.customerPhone ||
    snapshot.customerEmail !== storedSnapshot.customerEmail ||
    snapshot.customerCi !== storedSnapshot.customerCi ||
    snapshot.customerLocation !== storedSnapshot.customerLocation

  const canSubmit =
    hasChanges && nameValid && emailValid && phoneValid && ciValid && locationValid && !pending

  function handleSubmit() {
    let valid = true
    if (!nameValid) {
      setNameHint("Ingresa el nombre")
      valid = false
    }
    if (!emailValid) {
      setEmailHint(customerEmail.trim() ? "Email inválido" : "Ingresa el email")
      valid = false
    }
    if (!phoneValid) {
      setPhoneHint("Teléfono inválido")
      valid = false
    }
    if (!ciValid) {
      setCiHint(ciNumber.trim() ? "Cédula inválida" : "Ingresa la cédula")
      valid = false
    }
    if (!locationValid) {
      setLocationHint(
        customerLocationFieldError({
          locationType,
          selectedState,
          selectedMunicipality,
          customLocation,
          requireMunicipality,
        }),
      )
      valid = false
    }
    if (!valid || !hasChanges) return
    onSave(snapshot)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn(SHEET_LAYOUT_CLASS, SHEET_WIDTH_CLASS)}>
        <SheetHeader className="shrink-0 space-y-1 border-b px-4 py-3 pr-12 text-left">
          <SheetTitle className="text-base">Editar datos del comprador</SheetTitle>
          <SheetDescription className="text-left text-xs leading-snug">
            Compra #{purchase.id} · {purchase.customer_name}. Solo esta compra se actualiza;
            verificación y correos usarán los datos corregidos.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4">
          <div className="mx-auto w-full max-w-2xl">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6">
              <div className="md:col-span-2">
                <LabeledIconField
                  id="admin-customer-name"
                  label="Nombre completo"
                  description="Como aparece en la cédula o documento."
                  icon={<UserCircleIcon className="size-4" aria-hidden />}
                  value={customerName}
                  onChange={(value) => {
                    setCustomerName(value)
                    setNameHint(undefined)
                  }}
                  disabled={pending}
                  error={nameHint}
                  autoComplete="name"
                  placeholder="Ej. María González"
                />
              </div>

              <div className="min-w-0">
                <PhoneInputField
                  value={customerPhone}
                  disabled={pending}
                  error={phoneHint}
                  onChange={(value) => {
                    setCustomerPhone(value)
                    setPhoneHint(undefined)
                  }}
                />
              </div>

              <div className="min-w-0">
                <CiInputField
                  prefix={ciPrefix}
                  number={ciNumber}
                  disabled={pending}
                  error={ciHint}
                  onPrefixChange={setCiPrefix}
                  onNumberChange={(value) => {
                    setCiNumber(value)
                    setCiHint(undefined)
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <LabeledIconField
                  id="admin-customer-email"
                  label="Email"
                  description="Para confirmaciones y avisos de la compra."
                  icon={<EnvelopeSimpleIcon className="size-4" aria-hidden />}
                  value={customerEmail}
                  onChange={(value) => {
                    setCustomerEmail(value)
                    setEmailHint(undefined)
                  }}
                  disabled={pending}
                  error={emailHint}
                  type="email"
                  autoComplete="email"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="md:col-span-2">
                <LocationFields
                  locationType={locationType}
                  selectedState={selectedState}
                  selectedMunicipality={selectedMunicipality}
                  customLocation={customLocation}
                  disabled={pending}
                  locationError={locationHint}
                  requireMunicipality={requireMunicipality}
                  onLocationTypeChange={(type) => {
                    setLocationType(type)
                    setLocationHint(undefined)
                  }}
                  onSelectedStateChange={(state) => {
                    setSelectedState(state)
                    setLocationHint(undefined)
                  }}
                  onSelectedMunicipalityChange={(municipality) => {
                    setSelectedMunicipality(municipality)
                    setLocationHint(undefined)
                  }}
                  onCustomLocationChange={(value) => {
                    setCustomLocation(value)
                    setLocationHint(undefined)
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className="shrink-0 border-t bg-background shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.4)]"
          role="group"
          aria-label="Acciones"
        >
          <div className="box-border w-full max-w-full min-w-0 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {!hasChanges ? (
              <p className="text-muted-foreground mb-2 text-center text-xs sm:text-left">
                No hay cambios pendientes
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full min-w-0 sm:col-start-1 sm:h-9"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="h-11 w-full min-w-0 sm:col-start-2 sm:h-9"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
