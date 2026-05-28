import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { CiInputField } from "@/features/raffle/purchase-form/CiInputField"
import { LocationFields } from "@/features/raffle/purchase-form/LocationFields"
import { PhoneInputField } from "@/features/raffle/purchase-form/PhoneInputField"
import { SectionHeader } from "@/features/raffle/purchase-form/ui"
import type { CedulaPrefix, CustomerLocationType } from "@raffle/shared/validators"
import type { PhoneInputMode } from "@raffle/shared/validators"

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
  hasSavedProfile: boolean
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
  onApplySavedProfile: () => void
}

export function CustomerDetailsStep({
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
  hasSavedProfile,
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
  onApplySavedProfile,
}: CustomerDetailsStepProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <SectionHeader title="Tus datos" />
        {hasSavedProfile ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            disabled={disabled}
            onClick={onApplySavedProfile}
          >
            Autocompletar
          </Button>
        ) : null}
      </div>

      <FieldGroup className="gap-3">
        <Field data-invalid={!!hints.name}>
          <FieldLabel htmlFor="customer-name">Nombre</FieldLabel>
          <Input
            id="customer-name"
            value={customerName}
            onChange={(event) => onCustomerNameChange(event.target.value)}
            disabled={disabled}
            aria-invalid={!!hints.name}
            className="h-9"
            autoComplete="name"
          />
          <FieldError>{hints.name}</FieldError>
        </Field>

        <PhoneInputField
          value={customerPhone}
          mode={phoneMode}
          disabled={disabled}
          error={hints.phone}
          onChange={onCustomerPhoneChange}
          onModeChange={onPhoneModeChange}
        />

        <Field data-invalid={!!hints.email}>
          <FieldLabel htmlFor="customer-email">Email</FieldLabel>
          <Input
            id="customer-email"
            type="email"
            value={customerEmail}
            onChange={(event) => onCustomerEmailChange(event.target.value)}
            disabled={disabled}
            aria-invalid={!!hints.email}
            className="h-9"
            autoComplete="email"
          />
          <FieldError>{hints.email}</FieldError>
        </Field>

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
}
