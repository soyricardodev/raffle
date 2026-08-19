import { EnvelopeSimpleIcon, UserCircleIcon } from "@phosphor-icons/react"
import type { CedulaPrefix, CustomerLocationType } from "@raffle/shared/validators"
import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { CiInputField } from "@/features/raffle/purchase-form/CiInputField"
import { purchaseSectionCardClassName } from "@/features/raffle/purchase-form/field-styles"
import { LabeledIconField } from "@/features/raffle/purchase-form/LabeledIconField"
import { LocationFields } from "@/features/raffle/purchase-form/LocationFields"
import { PhoneInputField } from "@/features/raffle/purchase-form/PhoneInputField"
import { cn } from "@/lib/utils"

type CustomerDetailsStepProps = {
  disabled: boolean
  customerName: string
  customerPhone: string
  customerEmail: string
  ciPrefix: CedulaPrefix
  ciNumber: string
  locationType: CustomerLocationType
  selectedState: string
  selectedMunicipality: string
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
  onLocationTypeChange: (type: CustomerLocationType) => void
  onSelectedStateChange: (state: string) => void
  onSelectedMunicipalityChange: (municipality: string) => void
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
  locationType,
  selectedState,
  selectedMunicipality,
  customLocation,
  savedProfileName,
  savedProfileDismissed,
  hints,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerEmailChange,
  onCiPrefixChange,
  onCiNumberChange,
  onLocationTypeChange,
  onSelectedStateChange,
  onSelectedMunicipalityChange,
  onCustomLocationChange,
  onUseOtherSavedData,
  onRestoreSavedProfile,
}: CustomerDetailsStepProps) {
  const usingSavedProfile = Boolean(savedProfileName) && !savedProfileDismissed

  return (
    <section className={cn(purchaseSectionCardClassName, "flex flex-col gap-2.5")}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            2
          </Badge>
          <h3 className="text-sm font-semibold">Tus datos para los boletos</h3>
        </div>
        {usingSavedProfile ? (
          <div className="mt-1 flex flex-col items-start gap-0.5">
            <p className="text-muted-foreground text-xs leading-snug">
              Autocompletamos tu compra anterior. Solo revisa que nombre, teléfono y correo sigan
              correctos antes de pagar.
            </p>
            <Button
              type="button"
              variant="link"
              size="xs"
              className="text-muted-foreground hover:text-foreground h-auto px-0 text-xs"
              disabled={disabled}
              onClick={onUseOtherSavedData}
            >
              Usar otros datos
            </Button>
          </div>
        ) : savedProfileName && savedProfileDismissed ? (
          <Button
            type="button"
            variant="link"
            size="xs"
            className="mt-1 h-auto px-0 text-xs"
            disabled={disabled}
            onClick={onRestoreSavedProfile}
          >
            Volver a usar mis datos guardados
          </Button>
        ) : null}
      </div>

      <FieldGroup className="gap-2.5">
        <LabeledIconField
          id="customer-name"
          label="Nombre completo"
          icon={<UserCircleIcon className="size-4" aria-hidden />}
          value={customerName}
          onChange={onCustomerNameChange}
          disabled={disabled}
          error={hints.name}
          success={usingSavedProfile && customerName.trim().length > 0}
          autoComplete="name"
          placeholder="Ej. María González"
        />

        <CiInputField
          prefix={ciPrefix}
          number={ciNumber}
          disabled={disabled}
          error={hints.ci}
          success={usingSavedProfile && ciNumber.trim().length > 0}
          onPrefixChange={onCiPrefixChange}
          onNumberChange={onCiNumberChange}
        />

        <PhoneInputField
          value={customerPhone}
          disabled={disabled}
          error={hints.phone}
          success={usingSavedProfile && customerPhone.trim().length > 0}
          onChange={onCustomerPhoneChange}
        />

        <LabeledIconField
          id="customer-email"
          label="Correo electrónico"
          icon={<EnvelopeSimpleIcon className="size-4" aria-hidden />}
          value={customerEmail}
          onChange={onCustomerEmailChange}
          disabled={disabled}
          error={hints.email}
          success={usingSavedProfile && customerEmail.trim().length > 0}
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
        />

        <LocationFields
          locationType={locationType}
          selectedState={selectedState}
          selectedMunicipality={selectedMunicipality}
          customLocation={customLocation}
          disabled={disabled}
          locationError={hints.location}
          success={
            usingSavedProfile &&
            (locationType === "venezuela"
              ? selectedState.trim().length > 0 && selectedMunicipality.trim().length > 0
              : customLocation.trim().length > 0)
          }
          onLocationTypeChange={onLocationTypeChange}
          onSelectedStateChange={onSelectedStateChange}
          onSelectedMunicipalityChange={onSelectedMunicipalityChange}
          onCustomLocationChange={onCustomLocationChange}
        />
      </FieldGroup>
    </section>
  )
})
