import { MinusIcon, PlusIcon } from "@phosphor-icons/react"
import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  purchaseStepClassName,
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
    <section className={purchaseStepClassName} aria-labelledby="ticket-quantity-heading">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="shrink-0 tabular-nums">
          1
        </Badge>
        <h3 id="ticket-quantity-heading" className="text-sm font-semibold">
          Cantidad de boletos
        </h3>
        {soldOut ? (
          <p className="text-muted-foreground text-xs">No hay boletos disponibles</p>
        ) : available > 0 ? (
          <p className="text-muted-foreground ml-auto text-xs tabular-nums">
            {available.toLocaleString("es-VE")} disponibles
          </p>
        ) : null}
      </div>

      {selloutFlex ? (
        <p className="text-xs leading-snug text-emerald-800 dark:text-emerald-200">
          Quedan pocos: puedes comprar de 1 a{" "}
          <span className="font-semibold tabular-nums">{effectiveMax.toLocaleString("es-VE")}</span>.
        </p>
      ) : null}

      {paymentMinAboveRaffle ? (
        <p className="text-xs leading-snug text-amber-800 dark:text-amber-200">
          El mínimo para comprar aquí es{" "}
          <span className="font-semibold tabular-nums">{quantityMin}</span> boletos.
        </p>
      ) : null}

      <div className="grid grid-cols-2 items-stretch gap-2">
        <Field className="min-w-0 gap-0">
          <FieldLabel htmlFor="ticket-quantity" className="sr-only">
            Cantidad de boletos
          </FieldLabel>
          <div
            className={cn(
              "flex h-14 min-w-0 items-center gap-0.5 rounded-2xl border border-border bg-background px-0.5",
              disabled && "opacity-60",
            )}
          >
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
              className="size-11 shrink-0 rounded-full"
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
              "flex min-w-0 flex-col justify-center rounded-2xl border border-border bg-muted/40 px-2.5 py-1.5 text-right",
              hasSavings && "border-emerald-500/35 bg-emerald-500/10",
            )}
          >
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
              Total
            </p>
            <p className="truncate font-serif text-xl font-bold leading-tight tabular-nums">
              {formatCurrency(subtotal, currency)}
            </p>
            {subtotalUsd != null ? (
              <p className="text-muted-foreground truncate text-xs font-semibold tabular-nums">
                {formatCurrency(subtotalUsd, "USD")}
              </p>
            ) : null}
            {hasSavings ? (
              <p className="truncate text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                Ahorras {formatCurrency(savings, currency)}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="text-muted-foreground flex min-w-0 items-center justify-center rounded-2xl border border-border bg-muted/40 px-2 text-center text-xs font-medium">
            {quantity} boleto{quantity === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {quickPicks.length > 1 ? (
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
      ) : null}

    </section>
  )
})
