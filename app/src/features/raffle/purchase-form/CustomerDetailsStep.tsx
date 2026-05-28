import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LocationFields } from "@/features/raffle/purchase-form/LocationFields"
import { FieldHint, SectionHeader } from "@/features/raffle/purchase-form/ui"
import type { CustomerLocationType } from "@raffle/shared/validators"

type CustomerDetailsStepProps = {
  disabled: boolean
  customerName: string
  customerPhone: string
  customerEmail: string
  customerCi: string
  locationType: CustomerLocationType
  selectedState: string
  customLocation: string
  hints: {
    name?: string
    phone?: string
    location?: string
  }
  onCustomerNameChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
  onCustomerEmailChange: (value: string) => void
  onCustomerCiChange: (value: string) => void
  onLocationTypeChange: (type: CustomerLocationType) => void
  onSelectedStateChange: (state: string) => void
  onCustomLocationChange: (value: string) => void
}

export function CustomerDetailsStep({
  disabled,
  customerName,
  customerPhone,
  customerEmail,
  customerCi,
  locationType,
  selectedState,
  customLocation,
  hints,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerEmailChange,
  onCustomerCiChange,
  onLocationTypeChange,
  onSelectedStateChange,
  onCustomLocationChange,
}: CustomerDetailsStepProps) {
  return (
    <section className="space-y-3">
      <SectionHeader step={2} title="Tus datos" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer-name">Nombre completo *</Label>
          <Input
            id="customer-name"
            value={customerName}
            onChange={(event) => onCustomerNameChange(event.target.value)}
            disabled={disabled}
            aria-invalid={!!hints.name}
            className="min-h-11"
            autoComplete="name"
          />
          <FieldHint message={hints.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-phone">Teléfono *</Label>
          <Input
            id="customer-phone"
            type="tel"
            inputMode="tel"
            value={customerPhone}
            onChange={(event) => onCustomerPhoneChange(event.target.value)}
            disabled={disabled}
            aria-invalid={!!hints.phone}
            className="min-h-11"
            placeholder="04121234567"
            autoComplete="tel"
          />
          <FieldHint message={hints.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-email">Email (opcional)</Label>
          <Input
            id="customer-email"
            type="email"
            value={customerEmail}
            onChange={(event) => onCustomerEmailChange(event.target.value)}
            disabled={disabled}
            className="min-h-11"
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-ci">Cédula (opcional)</Label>
          <Input
            id="customer-ci"
            value={customerCi}
            onChange={(event) => onCustomerCiChange(event.target.value)}
            disabled={disabled}
            className="min-h-11"
            placeholder="V12345678"
          />
        </div>
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
      </div>
    </section>
  )
}
