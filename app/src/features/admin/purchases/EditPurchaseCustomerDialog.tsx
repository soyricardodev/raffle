import { EnvelopeSimpleIcon, UserCircleIcon } from "@phosphor-icons/react"
import {
  customerLocationFieldError,
  formatCustomerCi,
  formatCustomerLocation,
  isValidCustomerCi,
  isValidCustomerPhone,
  parseCustomerCi,
  splitVenezuelanMobile,
  type CedulaPrefix,
  type CustomerLocationType,
  type PhoneInputMode,
} from "@raffle/shared/validators"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { parsePurchaseLocationFormState } from "@/features/admin/purchases/parse-purchase-location"
import type { PurchaseDetail } from "@/features/admin/purchases/types"
import { CiInputField } from "@/features/raffle/purchase-form/CiInputField"
import { LabeledIconField } from "@/features/raffle/purchase-form/LabeledIconField"
import { LocationFields } from "@/features/raffle/purchase-form/LocationFields"
import { PhoneInputField } from "@/features/raffle/purchase-form/PhoneInputField"

function inferPhoneMode(phone: string): PhoneInputMode {
  const trimmed = phone.trim()
  if (trimmed.startsWith("+")) return "other"
  if (splitVenezuelanMobile(trimmed)) return "venezuela"
  return "venezuela"
}

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

type EditPurchaseCustomerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchase: PurchaseDetail
  pending?: boolean
  onSave: (payload: EditPurchaseCustomerPayload) => void
}

export function EditPurchaseCustomerDialog({
  open,
  onOpenChange,
  purchase,
  pending = false,
  onSave,
}: EditPurchaseCustomerDialogProps) {
  const [customerName, setCustomerName] = useState(purchase.customer_name)
  const [customerPhone, setCustomerPhone] = useState(purchase.customer_phone)
  const [customerEmail, setCustomerEmail] = useState(purchase.customer_email?.trim() ?? "")
  const [phoneMode, setPhoneMode] = useState<PhoneInputMode>(() =>
    inferPhoneMode(purchase.customer_phone),
  )
  const initialCi = ciPartsFromStored(purchase.customer_ci)
  const [ciPrefix, setCiPrefix] = useState<CedulaPrefix>(initialCi.prefix)
  const [ciNumber, setCiNumber] = useState(initialCi.number)
  const initialLocation = parsePurchaseLocationFormState(purchase.customer_location)
  const [locationType, setLocationType] = useState<CustomerLocationType>(initialLocation.locationType)
  const [selectedState, setSelectedState] = useState(initialLocation.selectedState)
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
    setPhoneMode(inferPhoneMode(purchase.customer_phone))
    const ci = ciPartsFromStored(purchase.customer_ci)
    setCiPrefix(ci.prefix)
    setCiNumber(ci.number)
    const loc = parsePurchaseLocationFormState(purchase.customer_location)
    setLocationType(loc.locationType)
    setSelectedState(loc.selectedState)
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
  const customerLocation = formatCustomerLocation(locationType, selectedState, customLocation)

  const nameValid = customerName.trim().length > 0
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
  const phoneValid = isValidCustomerPhone(customerPhone, phoneMode)
  const ciValid = formattedCi.length > 0 && isValidCustomerCi(formattedCi)
  const locationValid = !customerLocationFieldError(locationType, selectedState, customLocation)

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
      setLocationHint(customerLocationFieldError(locationType, selectedState, customLocation))
      valid = false
    }
    if (!valid || !hasChanges) return
    onSave(snapshot)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,720px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar datos del comprador</DialogTitle>
          <DialogDescription>
            Compra #{purchase.id}. Solo se actualiza esta compra; correos y verificación usarán los
            datos corregidos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <LabeledIconField
            id="admin-customer-name"
            label="Nombre completo"
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

          <PhoneInputField
            value={customerPhone}
            mode={phoneMode}
            disabled={pending}
            error={phoneHint}
            onChange={(value) => {
              setCustomerPhone(value)
              setPhoneHint(undefined)
            }}
            onModeChange={(mode) => {
              setPhoneMode(mode)
              setPhoneHint(undefined)
            }}
          />

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

          <LabeledIconField
            id="admin-customer-email"
            label="Email"
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

          <LocationFields
            locationType={locationType}
            selectedState={selectedState}
            customLocation={customLocation}
            disabled={pending}
            locationError={locationHint}
            onLocationTypeChange={(type) => {
              setLocationType(type)
              setLocationHint(undefined)
            }}
            onSelectedStateChange={(state) => {
              setSelectedState(state)
              setLocationHint(undefined)
            }}
            onCustomLocationChange={(value) => {
              setCustomLocation(value)
              setLocationHint(undefined)
            }}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
