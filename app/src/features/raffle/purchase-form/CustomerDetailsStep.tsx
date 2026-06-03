import type { CedulaPrefix, CustomerLocationType, PhoneInputMode } from "@raffle/shared/validators"
import { EnvelopeSimpleIcon, UserCircleIcon } from "@phosphor-icons/react"
import { memo } from "react"
import { FieldGroup } from "@/components/ui/field"
import { CiInputField } from "@/features/raffle/purchase-form/CiInputField"
import { LabeledIconField } from "@/features/raffle/purchase-form/LabeledIconField"
import { LocationFields } from "@/features/raffle/purchase-form/LocationFields"
import { PhoneInputField } from "@/features/raffle/purchase-form/PhoneInputField"
import { SavedBuyerProfileBanner } from "@/features/raffle/purchase-form/SavedBuyerProfileBanner"
import { SectionHeader } from "@/features/raffle/purchase-form/ui"

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
    <section className="flex flex-col gap-2">
      <SectionHeader title="Tus datos" />

      {savedProfileName ? (
        <SavedBuyerProfileBanner
          customerName={savedProfileName}
          dismissed={savedProfileDismissed}
          disabled={disabled}
          onUseOtherData={onUseOtherSavedData}
          onRestoreSavedProfile={onRestoreSavedProfile}
        />
      ) : null}

      <FieldGroup className="gap-3">
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

        <PhoneInputField
          value={customerPhone}
          mode={phoneMode}
          disabled={disabled}
          error={hints.phone}
          onChange={onCustomerPhoneChange}
          onModeChange={onPhoneModeChange}
        />

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

        <CiInputField
          prefix={ciPrefix}
          number={ciNumber}
          disabled={disabled}
          error={hints.ci}
          onPrefixChange={onCiPrefixChange}
          onNumberChange={onCiNumberChange}
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
