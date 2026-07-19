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
import {
  purchaseSectionCardClassName,
  quickPickToggleItemClassName,
} from "@/features/raffle/purchase-form/field-styles"
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
  originalUnitPrice?: number
  discountPerTicket?: number
  unitPriceUsd?: number
  originalUnitPriceUsd?: number
  discountPerTicketUsd?: number
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
  originalUnitPrice,
  discountPerTicket,
  unitPriceUsd,
  originalUnitPriceUsd,
  discountPerTicketUsd,
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
        maxChips: 6,
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
  const savingsUsd =
    discountPerTicketUsd != null && discountPerTicketUsd > 0
      ? discountPerTicketUsd * quantity
      : null
  const hasSavings = savings != null && savings > 0
  const hasUsdSavings = savingsUsd != null && savingsUsd > 0

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

      <div className="flex items-stretch gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-12 shrink-0 rounded-full border-primary/30 bg-background shadow-sm"
          disabled={quantity <= quantityMin || disabled || soldOut}
          onClick={() => onChange(Math.max(quantityMin, quantity - 1))}
          aria-label="Un boleto menos"
        >
          <MinusIcon className="size-5" />
        </Button>

        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor="ticket-quantity" className="sr-only">
            Cantidad de boletos
          </FieldLabel>
          <div
            className={cn(
              "flex h-12 items-center justify-center rounded-2xl border-2 border-primary/30 bg-background/80 px-3 shadow-inner",
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
              className="h-auto border-0 bg-transparent p-0 text-center font-serif text-3xl font-bold tabular-nums shadow-none focus-visible:ring-0"
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
          variant="default"
          size="icon"
          className="size-12 shrink-0 rounded-full shadow-md"
          disabled={quantity >= effectiveMax || disabled || soldOut}
          onClick={() => onChange(Math.min(effectiveMax, quantity + 1))}
          aria-label="Un boleto más"
        >
          <PlusIcon className="size-5" />
        </Button>
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
            className="flex w-full gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

      {subtotal != null ? (
        <div
          className={cn(
            "overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/8 to-card shadow-sm shadow-primary/10",
            hasSavings && "border-emerald-500/35 from-emerald-500/15 via-primary/10",
          )}
        >
          <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,max-content)] sm:items-end">
            <div className="flex min-w-0 flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <TicketIcon className="text-primary size-4 shrink-0" aria-hidden />
                  {quantity} boleto{quantity === 1 ? "" : "s"}
                </span>
                {hasSavings ? (
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700">
                    Promo aplicada
                  </Badge>
                ) : null}
              </div>

              <div className="grid max-w-sm grid-cols-[minmax(0,1fr)_max-content] items-baseline gap-x-3 gap-y-1 text-xs">
                <span className="text-muted-foreground">Precio por boleto</span>
                <span className="whitespace-nowrap text-right font-medium tabular-nums text-foreground">
                  {originalUnitPrice != null && originalUnitPrice > unitPrice! ? (
                    <span className="text-muted-foreground mr-1 line-through">
                      {formatCurrency(originalUnitPrice, currency)}
                    </span>
                  ) : null}
                  {formatCurrency(unitPrice!, currency)}
                </span>

                {unitPriceUsd != null ? (
                  <>
                    <span className="text-muted-foreground">Equivalente USD</span>
                    <span className="whitespace-nowrap text-right font-medium tabular-nums text-foreground">
                      {originalUnitPriceUsd != null && originalUnitPriceUsd > unitPriceUsd ? (
                        <span className="text-muted-foreground mr-1 line-through">
                          {formatCurrency(originalUnitPriceUsd, "USD")}
                        </span>
                      ) : null}
                      {formatCurrency(unitPriceUsd, "USD")}
                    </span>
                  </>
                ) : null}
              </div>

              {hasSavings ? (
                <p className="text-xs font-medium text-emerald-700">
                  Ahorras {formatCurrency(savings, currency)}
                  {hasUsdSavings ? ` · ${formatCurrency(savingsUsd, "USD")}` : ""}
                </p>
              ) : null}
              {priceIsEstimate ? (
                <p className="text-muted-foreground text-[10px] leading-snug">
                  Estimado hasta elegir el método de pago.
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-primary/20 bg-background/70 px-3 py-2 text-right shadow-inner">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                Subtotal
              </p>
              <p className="whitespace-nowrap font-serif text-[clamp(1.5rem,5vw,2rem)] font-bold leading-tight tabular-nums text-foreground">
                {formatCurrency(subtotal, currency)}
              </p>
              {subtotalUsd != null ? (
                <p className="text-muted-foreground mt-1 whitespace-nowrap text-sm font-semibold tabular-nums">
                  {formatCurrency(subtotalUsd, "USD")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-center text-sm font-medium tabular-nums">
          {quantity} boleto{quantity === 1 ? "" : "s"} seleccionado
          {quantity === 1 ? "" : "s"}
        </p>
      )}
    </section>
  )
})
