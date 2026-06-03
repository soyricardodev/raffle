import { MinusIcon, PlusIcon, TicketIcon } from "@phosphor-icons/react"
import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  buildSmartQuickPicks,
  clampQuantity,
} from "@/features/raffle/purchase-form/ticket-quantity-utils"
import { SectionHeader } from "@/features/raffle/purchase-form/ui"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

type TicketQuantityStepProps = {
  quantity: number
  quantityMin: number
  raffleMinPurchase: number
  effectiveMax: number
  available: number
  paymentThresholds: number[]
  unitPrice?: number
  originalUnitPrice?: number
  discountPerTicket?: number
  currency?: "Bs" | "USD"
  priceIsEstimate?: boolean
  disabled: boolean
  onChange: (quantity: number) => void
}

export const TicketQuantityStep = memo(function TicketQuantityStep({
  quantity,
  quantityMin,
  raffleMinPurchase,
  effectiveMax,
  available,
  paymentThresholds,
  unitPrice,
  originalUnitPrice,
  discountPerTicket,
  currency = "Bs",
  priceIsEstimate = false,
  disabled,
  onChange,
}: TicketQuantityStepProps) {
  const [draft, setDraft] = useState(String(quantity))

  const quickPicks = useMemo(
    () =>
      buildSmartQuickPicks(quantityMin, effectiveMax, {
        paymentThresholds,
        maxChips: 6,
      }),
    [quantityMin, effectiveMax, paymentThresholds],
  )

  const paymentMinAboveRaffle =
    quantityMin > raffleMinPurchase &&
    paymentThresholds.some((t) => t > raffleMinPurchase)

  useEffect(() => {
    setDraft(String(quantity))
  }, [quantity])

  const commitDraft = useCallback(() => {
    const parsed = Number.parseInt(draft, 10)
    onChange(clampQuantity(parsed, quantityMin, effectiveMax))
  }, [draft, effectiveMax, onChange, quantityMin])

  const handleQuickPick = useCallback(
    (value: string) => {
      if (!value) return
      onChange(clampQuantity(Number.parseInt(value, 10), quantityMin, effectiveMax))
    },
    [effectiveMax, onChange, quantityMin],
  )

  const subtotal =
    unitPrice != null && Number.isFinite(unitPrice) ? unitPrice * quantity : null
  const savings =
    discountPerTicket != null && discountPerTicket > 0
      ? discountPerTicket * quantity
      : null

  const soldOut = available <= 0 || effectiveMax < quantityMin

  return (
    <section className="flex flex-col gap-3" aria-labelledby="ticket-quantity-heading">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <SectionHeader title="Cantidad" />
          <p id="ticket-quantity-heading" className="sr-only">
            Selecciona cuántos boletos comprar
          </p>
          <p className="text-muted-foreground text-xs leading-snug">
            {soldOut ? (
              "No hay boletos disponibles"
            ) : (
              <>
                <span className="text-foreground font-medium tabular-nums">
                  {available.toLocaleString("es-VE")}
                </span>{" "}
                disponibles · elige entre{" "}
                <span className="tabular-nums">
                  {quantityMin} y {effectiveMax.toLocaleString("es-VE")}
                </span>
              </>
            )}
          </p>
        </div>
        {quantityMin > 1 ? (
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            Mín. {quantityMin}
          </Badge>
        ) : null}
      </div>

      {paymentMinAboveRaffle ? (
        <p className="bg-muted/60 text-muted-foreground rounded-lg px-3 py-2 text-xs leading-snug">
          Algunos métodos de pago piden más boletos. El mínimo para comprar aquí es{" "}
          <span className="text-foreground font-medium tabular-nums">{quantityMin}</span>.
        </p>
      ) : null}

      <div className="flex items-stretch gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          disabled={quantity <= quantityMin || disabled || soldOut}
          onClick={() => onChange(Math.max(quantityMin, quantity - 1))}
          aria-label="Un boleto menos"
        >
          <MinusIcon className="size-4" />
        </Button>

        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor="ticket-quantity" className="sr-only">
            Cantidad de boletos
          </FieldLabel>
          <div
            className={cn(
              "bg-muted/50 flex h-11 items-center justify-center rounded-full border px-3",
              disabled && "opacity-60",
            )}
          >
            <Input
              id="ticket-quantity"
              type="number"
              inputMode="numeric"
              min={quantityMin}
              max={effectiveMax}
              value={draft}
              disabled={disabled || soldOut}
              className="h-auto border-0 bg-transparent p-0 text-center font-serif text-2xl font-semibold tabular-nums shadow-none focus-visible:ring-0"
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitDraft()
                }
              }}
            />
          </div>
        </Field>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          disabled={quantity >= effectiveMax || disabled || soldOut}
          onClick={() => onChange(Math.min(effectiveMax, quantity + 1))}
          aria-label="Un boleto más"
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>

      {quickPicks.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            Accesos rápidos
          </p>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={1}
            value={String(quantity)}
            onValueChange={handleQuickPick}
            className="flex w-full gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            disabled={disabled || soldOut}
          >
            {quickPicks.map((pick) => (
              <ToggleGroupItem
                key={pick.value}
                value={String(pick.value)}
                aria-label={`${pick.value} boletos`}
                className={cn(
                  "h-9 min-w-10 shrink-0 rounded-full px-3 text-xs tabular-nums",
                  pick.value === quantity && "font-semibold",
                )}
              >
                {pick.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}

      {subtotal != null ? (
        <div className="bg-primary/5 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5">
          <div className="text-muted-foreground flex min-w-0 flex-col gap-0.5 text-xs">
            <span className="flex items-center gap-1.5">
              <TicketIcon className="size-3.5 shrink-0" aria-hidden />
              {quantity} boleto{quantity === 1 ? "" : "s"} ×{" "}
              {originalUnitPrice != null && originalUnitPrice > unitPrice! ? (
                <>
                  <span className="line-through opacity-70">
                    {formatCurrency(originalUnitPrice, currency)}
                  </span>{" "}
                </>
              ) : null}
              {formatCurrency(unitPrice!, currency)}
            </span>
            {savings != null && savings > 0 ? (
              <span className="text-emerald-700 dark:text-emerald-300">
                Ahorras {formatCurrency(savings, currency)}
              </span>
            ) : null}
            {priceIsEstimate ? (
              <span className="text-[10px]">Estimado en Bs (según método de pago)</span>
            ) : null}
          </div>
          <span className="font-serif text-base font-semibold tabular-nums">
            {formatCurrency(subtotal, currency)}
          </span>
        </div>
      ) : (
        <p className="text-muted-foreground text-center text-xs tabular-nums">
          {quantity} boleto{quantity === 1 ? "" : "s"} seleccionado
          {quantity === 1 ? "" : "s"}
        </p>
      )}
    </section>
  )
})
