import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupInput } from "@/components/ui/input-group"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  type PhoneInputMode,
  VENEZUELAN_MOBILE_PREFIXES,
  sanitizePhoneInput,
} from "@raffle/shared/validators"
import { cn } from "@/lib/utils"

type PhoneInputFieldProps = {
  value: string
  mode: PhoneInputMode
  disabled?: boolean
  error?: string
  onChange: (value: string) => void
  onModeChange: (mode: PhoneInputMode) => void
}

export function PhoneInputField({
  value,
  mode,
  disabled,
  error,
  onChange,
  onModeChange,
}: PhoneInputFieldProps) {
  const currentVenezuelanPrefix =
    mode === "venezuela" &&
    (VENEZUELAN_MOBILE_PREFIXES as readonly string[]).includes(value.slice(0, 4))
      ? value.slice(0, 4)
      : ""

  function switchMode(nextMode: PhoneInputMode) {
    onModeChange(nextMode)
    if (nextMode === "international") {
      onChange(value.startsWith("+") ? value : `+${value.replace(/\D/g, "")}`)
      return
    }
    onChange(sanitizePhoneInput(value, "venezuela"))
  }

  function applyPrefix(prefix: string) {
    onModeChange("venezuela")
    const digits = value.replace(/\D/g, "")
    const rest = (VENEZUELAN_MOBILE_PREFIXES as readonly string[]).includes(digits.slice(0, 4))
      ? digits.slice(4)
      : digits
    onChange(`${prefix}${rest}`.slice(0, 11))
  }

  function handlePhoneChange(raw: string) {
    if (raw.trim().startsWith("+") && mode !== "international") {
      onModeChange("international")
      onChange(sanitizePhoneInput(raw, "international"))
      return
    }
    onChange(sanitizePhoneInput(raw, mode))
  }

  return (
    <Field data-invalid={!!error}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor="customer-phone">Teléfono</FieldLabel>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 text-xs"
          disabled={disabled}
          onClick={() =>
            switchMode(mode === "venezuela" ? "international" : "venezuela")
          }
        >
          {mode === "venezuela" ? "Otro país" : "Venezuela"}
        </Button>
      </div>

      {mode === "venezuela" ? (
        <ToggleGroup
          type="single"
          value={currentVenezuelanPrefix}
          onValueChange={(prefix) => {
            if (prefix) applyPrefix(prefix)
          }}
          variant="outline"
          size="sm"
          spacing={1}
          className="flex w-full flex-wrap"
          disabled={disabled}
          aria-label="Prefijo"
        >
          {VENEZUELAN_MOBILE_PREFIXES.map((prefix) => (
            <ToggleGroupItem
              key={prefix}
              value={prefix}
              aria-label={prefix}
              className="px-2 font-mono text-[11px]"
            >
              {prefix}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : null}

      <InputGroup className={cn("h-9", mode === "international" && "font-mono")}>
        <InputGroupInput
          id="customer-phone"
          type="tel"
          inputMode={mode === "international" ? "tel" : "numeric"}
          autoComplete="tel"
          placeholder={mode === "international" ? "+58..." : "04121234567"}
          value={value}
          disabled={disabled}
          aria-invalid={!!error}
          onChange={(event) => handlePhoneChange(event.target.value)}
        />
      </InputGroup>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
