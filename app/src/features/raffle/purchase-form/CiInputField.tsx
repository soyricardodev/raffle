import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  type CedulaPrefix,
  sanitizeCiDigits,
} from "@raffle/shared/validators"

const PREFIXES: CedulaPrefix[] = ["V", "E", "J"]

type CiInputFieldProps = {
  prefix: CedulaPrefix
  number: string
  disabled?: boolean
  error?: string
  onPrefixChange: (prefix: CedulaPrefix) => void
  onNumberChange: (number: string) => void
}

export function CiInputField({
  prefix,
  number,
  disabled,
  error,
  onPrefixChange,
  onNumberChange,
}: CiInputFieldProps) {
  function handlePrefixChange(value: string) {
    if (!value) return
    onPrefixChange(value as CedulaPrefix)
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="customer-ci-number">CI</FieldLabel>
      <InputGroup className="h-9">
        <InputGroupAddon align="inline-start" className="px-1">
          <ToggleGroup
            type="single"
            value={prefix}
            onValueChange={handlePrefixChange}
            variant="outline"
            size="sm"
            spacing={0}
            disabled={disabled}
            aria-label="Tipo CI"
          >
            {PREFIXES.map((p) => (
              <ToggleGroupItem
                key={p}
                value={p}
                aria-label={p}
                className="min-w-7 px-1.5 text-xs font-semibold"
              >
                {p}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </InputGroupAddon>
        <InputGroupInput
          id="customer-ci-number"
          inputMode="numeric"
          autoComplete="off"
          placeholder="12345678"
          value={number}
          disabled={disabled}
          aria-invalid={!!error}
          onChange={(event) => onNumberChange(sanitizeCiDigits(event.target.value))}
        />
      </InputGroup>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
