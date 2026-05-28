import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldHint } from "@/features/raffle/purchase-form/ui"
import {
  type CustomerLocationType,
  VENEZUELA_STATES,
} from "@raffle/shared/validators"
import { Globe, MapPin } from "lucide-react"

type LocationFieldsProps = {
  locationType: CustomerLocationType
  selectedState: string
  customLocation: string
  disabled: boolean
  locationError?: string
  onLocationTypeChange: (type: CustomerLocationType) => void
  onSelectedStateChange: (state: string) => void
  onCustomLocationChange: (value: string) => void
}

export function LocationFields({
  locationType,
  selectedState,
  customLocation,
  disabled,
  locationError,
  onLocationTypeChange,
  onSelectedStateChange,
  onCustomLocationChange,
}: LocationFieldsProps) {
  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex items-center gap-2">
        <MapPin className="text-muted-foreground size-4 shrink-0" />
        <Label>¿Desde dónde juegas? *</Label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={locationType === "venezuela" ? "default" : "outline"}
          className="min-h-11 text-sm"
          disabled={disabled}
          onClick={() => onLocationTypeChange("venezuela")}
        >
          Venezuela 🇻🇪
        </Button>
        <Button
          type="button"
          variant={locationType === "other" ? "default" : "outline"}
          className="min-h-11 text-sm"
          disabled={disabled}
          onClick={() => onLocationTypeChange("other")}
        >
          <Globe className="mr-1 size-3.5 shrink-0" />
          Otro país
        </Button>
      </div>
      {locationType === "venezuela" ? (
        <div className="space-y-2">
          <Select
            value={selectedState || undefined}
            onValueChange={onSelectedStateChange}
            disabled={disabled}
          >
            <SelectTrigger
              id="customer-state"
              className="min-h-11 w-full"
              aria-invalid={!!locationError}
            >
              <SelectValue placeholder="Selecciona tu estado…" />
            </SelectTrigger>
            <SelectContent>
              {VENEZUELA_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldHint message={locationError} />
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            id="customer-location-other"
            value={customLocation}
            onChange={(event) => onCustomLocationChange(event.target.value)}
            disabled={disabled}
            aria-invalid={!!locationError}
            className="min-h-11"
            placeholder="¿País y ciudad?"
            maxLength={100}
          />
          <FieldHint message={locationError} />
        </div>
      )}
    </div>
  )
}
