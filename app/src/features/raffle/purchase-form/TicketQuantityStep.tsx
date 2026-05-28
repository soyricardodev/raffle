import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SectionHeader } from "@/features/raffle/purchase-form/ui"
import { MinusIcon, PlusIcon } from "@phosphor-icons/react"

type TicketQuantityStepProps = {
  quantity: number
  minPurchase: number
  effectiveMax: number
  available: number
  disabled: boolean
  onChange: (quantity: number) => void
}

function clampQuantity(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.floor(value)))
}

function buildQuickPicks(min: number, max: number): number[] {
  const candidates = [min, 2, 5, 10, 25, 50, max]
  const unique = [...new Set(candidates.filter((n) => n >= min && n <= max))]
  return unique.sort((a, b) => a - b)
}

export function TicketQuantityStep({
  quantity,
  minPurchase,
  effectiveMax,
  available,
  disabled,
  onChange,
}: TicketQuantityStepProps) {
  const [draft, setDraft] = useState(String(quantity))
  const quickPicks = buildQuickPicks(minPurchase, effectiveMax)

  useEffect(() => {
    setDraft(String(quantity))
  }, [quantity])

  function commitDraft() {
    const parsed = Number.parseInt(draft, 10)
    onChange(clampQuantity(parsed, minPurchase, effectiveMax))
  }

  function handleQuickPick(value: string) {
    if (!value) return
    onChange(clampQuantity(Number.parseInt(value, 10), minPurchase, effectiveMax))
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <SectionHeader title="Cantidad" />
        <span className="text-muted-foreground text-xs tabular-nums">
          {available} disp. · {minPurchase}–{effectiveMax}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={quantity <= minPurchase || disabled}
          onClick={() => onChange(Math.max(minPurchase, quantity - 1))}
          aria-label="Menos"
        >
          <MinusIcon />
        </Button>

        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor="ticket-quantity" className="sr-only">
            Cantidad
          </FieldLabel>
          <Input
            id="ticket-quantity"
            type="number"
            inputMode="numeric"
            min={minPurchase}
            max={effectiveMax}
            value={draft}
            disabled={disabled}
            className="h-9 text-center text-lg font-semibold tabular-nums"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commitDraft()
              }
            }}
          />
        </Field>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={quantity >= effectiveMax || disabled}
          onClick={() => onChange(Math.min(effectiveMax, quantity + 1))}
          aria-label="Más"
        >
          <PlusIcon />
        </Button>
      </div>

      {quickPicks.length > 1 ? (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={1}
          value={String(quantity)}
          onValueChange={handleQuickPick}
          className="flex w-full flex-wrap"
          disabled={disabled}
        >
          {quickPicks.map((pick) => (
            <ToggleGroupItem
              key={pick}
              value={String(pick)}
              aria-label={`${pick} boletos`}
              className="min-w-9 px-2 text-xs tabular-nums"
            >
              {pick}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : null}
    </section>
  )
}
