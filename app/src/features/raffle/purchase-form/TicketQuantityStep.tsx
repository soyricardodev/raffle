import { MinusIcon, PlusIcon } from "@phosphor-icons/react"
import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  purchaseSectionCardClassName,
  quickPickToggleItemClassName,
} from "@/features/raffle/purchase-form/field-styles"
import {
  buildSmartQuickPicks,
  clampQuantity,
} from "@/features/raffle/purchase-form/ticket-quantity-utils"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

type TicketQuantityStepProps = {
  quantity: number
  quantityMin: number
  raffleMinPurchase: number
  effectiveMax: number
  available: number
  paymentThresholds: Array<number>
  unitPrice?: number
  discountPerTicket?: number
  unitPriceUsd?: number
  totalBs?: number
  totalUsd?: number
  currency?: "Bs" | "USD"
  priceIsEstimate?: boolean
  selloutFlex?: boolean
  disabled: boolean
  onChange: (quantity: number) => void
}

export const TicketQuantityStep = memo(function TicketQuantityStepInner({
  quantity,
  quantityMin,
  raffleMinPurchase,
  effectiveMax,
  available,
  paymentThresholds,
  unitPrice,
  discountPerTicket,
  unitPriceUsd,
  totalBs,
  totalUsd,
  currency = "Bs",
  priceIsEstimate = false,
  selloutFlex = false,
  disabled,
  onChange,
}: TicketQuantityStepProps) {
  const [draft, setDraft] = useState(String(quantity))

  const quickPicks = useMemo(
    () =>
      buildSmartQuickPicks(quantityMin, effectiveMax, {
        paymentThresholds,
        maxChips: 5,
      }),
    [quantityMin, effectiveMax, paymentThresholds],
  )

  const paymentMinAboveRaffle =
    quantityMin > raffleMinPurchase && paymentThresholds.some((t) => t > raffleMinPurchase)

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
    totalBs ?? (unitPrice != null && Number.isFinite(unitPrice) ? unitPrice * quantity : null)
  const subtotalUsd =
    totalUsd ??
    (unitPriceUsd != null && Number.isFinite(unitPriceUsd) ? unitPriceUsd * quantity : null)
  const savings =
    discountPerTicket != null && discountPerTicket > 0 ? discountPerTicket * quantity : null
  const hasSavings = savings != null && savings > 0

  const soldOut = available <= 0 || effectiveMax < quantityMin

  return (
    <section
      className={cn(purchaseSectionCardClassName, "flex flex-col gap-3")}
      aria-labelledby="ticket-quantity-heading"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              1
            </Badge>
            <h3 id="ticket-quantity-heading" className="text-sm font-semibold">
              Cantidad de boletos
            </h3>
          </div>
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
          <Badge variant="outline" className="shrink-0 tabular-nums">
            Mín. {quantityMin}
          </Badge>
        ) : null}
      </div>

      {selloutFlex ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs leading-snug text-emerald-950 dark:text-emerald-100">
          Quedan pocos boletos: puedes comprar desde{" "}
          <span className="font-semibold tabular-nums">1</span> hasta{" "}
          <span className="font-semibold tabular-nums">{effectiveMax.toLocaleString("es-VE")}</span>.
        </p>
      ) : null}

      {paymentMinAboveRaffle ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-950 dark:text-amber-100">
          Algunos métodos de pago piden más boletos. El mínimo para comprar aquí es{" "}
          <span className="font-semibold tabular-nums">{quantityMin}</span>.
        </p>
      ) : null}

      <div className="grid grid-cols-2 items-stretch gap-2">
        <Field className="min-w-0 gap-0">
          <FieldLabel htmlFor="ticket-quantity" className="sr-only">
            Cantidad de boletos
          </FieldLabel>
          <div
            className={cn(
              "flex h-14 min-w-0 items-center gap-0.5 rounded-2xl border-2 border-primary/30 bg-background/80 px-0.5 shadow-inner",
              disabled && "opacity-60",
            )}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 shrink-0 rounded-full border-primary/30 bg-background"
              disabled={quantity <= quantityMin || disabled || soldOut}
              onClick={() => onChange(Math.max(quantityMin, quantity - 1))}
              aria-label="Un boleto menos"
            >
              <MinusIcon className="size-4" />
            </Button>
            <Input
              id="ticket-quantity"
              type="number"
              inputMode="numeric"
              min={quantityMin}
              max={effectiveMax}
              value={draft}
              disabled={disabled || soldOut}
              className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-center font-serif text-2xl font-bold tabular-nums shadow-none [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitDraft()
                }
              }}
            />
            <Button
              type="button"
              variant="default"
              size="icon"
              className="size-11 shrink-0 rounded-full shadow-md"
              disabled={quantity >= effectiveMax || disabled || soldOut}
              onClick={() => onChange(Math.min(effectiveMax, quantity + 1))}
              aria-label="Un boleto más"
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
        </Field>

        {subtotal != null ? (
          <div
            className={cn(
              "flex min-w-0 flex-col justify-center rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/8 to-card px-2.5 py-1.5 text-right shadow-sm shadow-primary/10",
              hasSavings && "border-emerald-500/35 from-emerald-500/15 via-primary/10",
            )}
          >
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
              Subtotal
            </p>
            <p className="truncate font-serif text-xl font-bold leading-tight tabular-nums text-foreground">
              {formatCurrency(subtotal, currency)}
            </p>
            {subtotalUsd != null ? (
              <p className="text-muted-foreground truncate text-xs font-semibold tabular-nums">
                {formatCurrency(subtotalUsd, "USD")}
              </p>
            ) : null}
            {hasSavings ? (
              <p className="truncate text-[10px] font-medium text-emerald-700">
                Ahorras {formatCurrency(savings, currency)}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="bg-muted/40 text-muted-foreground flex min-w-0 items-center justify-center rounded-2xl border px-2 text-center text-xs font-medium">
            {quantity} boleto{quantity === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {quickPicks.length > 1 ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
            Accesos rápidos
          </p>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={1}
            value={String(quantity)}
            onValueChange={handleQuickPick}
            className="flex w-full"
            disabled={disabled || soldOut}
          >
            {quickPicks.map((pick) => (
              <ToggleGroupItem
                key={pick.value}
                value={String(pick.value)}
                aria-label={`${pick.value} boletos`}
                className={quickPickToggleItemClassName}
              >
                {pick.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}

      {priceIsEstimate && subtotal != null ? (
        <p className="text-muted-foreground text-[10px] leading-snug">
          Estimado hasta elegir el método de pago.
        </p>
      ) : null}
    </section>
  )
})
