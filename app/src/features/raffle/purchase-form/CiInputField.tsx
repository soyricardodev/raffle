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
import { cn } from "@/lib/utils"

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
                className={cn(
                  "min-w-8 px-2 text-xs font-semibold transition-colors",
                  "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                  "data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground",
                )}
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
