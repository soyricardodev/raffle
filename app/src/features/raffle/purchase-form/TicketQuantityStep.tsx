import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"
import { SectionHeader } from "@/features/raffle/purchase-form/ui"

type TicketQuantityStepProps = {
  quantity: number
  minPurchase: number
  effectiveMax: number
  available: number
  disabled: boolean
  onChange: (quantity: number) => void
}

export function TicketQuantityStep({
  quantity,
  minPurchase,
  effectiveMax,
  available,
  disabled,
  onChange,
}: TicketQuantityStepProps) {
  return (
    <section className="space-y-3">
      <SectionHeader step={1} title="Cantidad de boletos" />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0"
          disabled={quantity <= minPurchase || disabled}
          onClick={() => onChange(Math.max(minPurchase, quantity - 1))}
          aria-label="Menos boletos"
        >
          <Minus className="size-4" />
        </Button>
        <span className="min-w-10 text-center text-2xl font-bold tabular-nums">{quantity}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0"
          disabled={quantity >= effectiveMax || disabled}
          onClick={() => onChange(Math.min(effectiveMax, quantity + 1))}
          aria-label="Más boletos"
        >
          <Plus className="size-4" />
        </Button>
        <p className="text-muted-foreground ml-auto text-right text-xs leading-snug">
          <span className="text-foreground font-medium">{available}</span> disponibles
          <br />
          mín {minPurchase} · máx {effectiveMax}
        </p>
      </div>
    </section>
  )
}
