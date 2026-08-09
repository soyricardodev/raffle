import { EnvelopeSimpleIcon, ShieldCheckIcon, UserCircleIcon } from "@phosphor-icons/react"
import type { CedulaPrefix, CustomerLocationType, PhoneInputMode } from "@raffle/shared/validators"
import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { FieldGroup } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { CiInputField } from "@/features/raffle/purchase-form/CiInputField"
import { purchaseSectionCardClassName } from "@/features/raffle/purchase-form/field-styles"
import { LabeledIconField } from "@/features/raffle/purchase-form/LabeledIconField"
import { LocationFields } from "@/features/raffle/purchase-form/LocationFields"
import { PhoneInputField } from "@/features/raffle/purchase-form/PhoneInputField"
import { SavedBuyerProfileBanner } from "@/features/raffle/purchase-form/SavedBuyerProfileBanner"
import { cn } from "@/lib/utils"

type CustomerDetailsStepProps = {
  disabled: boolean
  customerName: string
  customerPhone: string
  customerEmail: string
  ciPrefix: CedulaPrefix
  ciNumber: string
  phoneMode: PhoneInputMode
  locationType: CustomerLocationType
  selectedState: string
  customLocation: string
  savedProfileName: string | null
  savedProfileDismissed: boolean
  hints: {
    name?: string
    phone?: string
    email?: string
    ci?: string
    location?: string
  }
  onCustomerNameChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
  onCustomerEmailChange: (value: string) => void
  onCiPrefixChange: (prefix: CedulaPrefix) => void
  onCiNumberChange: (number: string) => void
  onPhoneModeChange: (mode: PhoneInputMode) => void
  onLocationTypeChange: (type: CustomerLocationType) => void
  onSelectedStateChange: (state: string) => void
  onCustomLocationChange: (value: string) => void
  onUseOtherSavedData: () => void
  onRestoreSavedProfile: () => void
}

export const CustomerDetailsStep = memo(function CustomerDetailsStep({
  disabled,
  customerName,
  customerPhone,
  customerEmail,
  ciPrefix,
  ciNumber,
  phoneMode,
  locationType,
  selectedState,
  customLocation,
  savedProfileName,
  savedProfileDismissed,
  hints,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerEmailChange,
  onCiPrefixChange,
  onCiNumberChange,
  onPhoneModeChange,
  onLocationTypeChange,
  onSelectedStateChange,
  onCustomLocationChange,
  onUseOtherSavedData,
  onRestoreSavedProfile,
}: CustomerDetailsStepProps) {
  return (
    <section className={cn(purchaseSectionCardClassName, "flex flex-col gap-3")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              2
            </Badge>
            <h3 className="text-sm font-semibold">Tus datos para los boletos</h3>
          </div>
          <p className="text-muted-foreground mt-1 flex items-start gap-1.5 text-xs leading-snug">
            <ShieldCheckIcon className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden />
            Usamos esta información solo para asignarte los números y enviarte la confirmación.
          </p>
        </div>
      </div>

      {savedProfileName ? (
        <SavedBuyerProfileBanner
          customerName={savedProfileName}
          dismissed={savedProfileDismissed}
          disabled={disabled}
          onUseOtherData={onUseOtherSavedData}
          onRestoreSavedProfile={onRestoreSavedProfile}
        />
      ) : null}

      <FieldGroup className="gap-4">
        <LabeledIconField
          id="customer-name"
          label="Nombre completo"
          description="Como aparece en tu cédula o documento."
          icon={<UserCircleIcon className="size-4" aria-hidden />}
          value={customerName}
          onChange={onCustomerNameChange}
          disabled={disabled}
          error={hints.name}
          autoComplete="name"
          placeholder="Ej. María González"
        />

        <CiInputField
          prefix={ciPrefix}
          number={ciNumber}
          disabled={disabled}
          error={hints.ci}
          onPrefixChange={onCiPrefixChange}
          onNumberChange={onCiNumberChange}
        />

        <PhoneInputField
          value={customerPhone}
          mode={phoneMode}
          disabled={disabled}
          error={hints.phone}
          onChange={onCustomerPhoneChange}
          onModeChange={onPhoneModeChange}
        />

        <Separator />

        <LabeledIconField
          id="customer-email"
          label="Correo electrónico"
          description="Te enviaremos la confirmación de tu compra."
          icon={<EnvelopeSimpleIcon className="size-4" aria-hidden />}
          value={customerEmail}
          onChange={onCustomerEmailChange}
          disabled={disabled}
          error={hints.email}
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
        />

        <LocationFields
          locationType={locationType}
          selectedState={selectedState}
          customLocation={customLocation}
          disabled={disabled}
          locationError={hints.location}
          onLocationTypeChange={onLocationTypeChange}
          onSelectedStateChange={onSelectedStateChange}
          onCustomLocationChange={onCustomLocationChange}
        />
      </FieldGroup>
    </section>
  )
})
