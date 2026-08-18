import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  applyDiscountChip,
  applyDurationPreset,
  type DiscountChip,
  discountChipFromForm,
  formatPriceShiftLine,
  type PaymentMethodOption,
  PERCENT_CHIPS,
  type PromoDurationMode,
  type PromoFormState,
  previewPromoPrices,
} from "@/features/admin/raffles/promotion-form-utils"
import { formatDatetimePickerLabel, parseDatetimeLocal } from "@/lib/date-input"
import { cn } from "@/lib/utils"

function formatDatetimeRangeHint(startsAt: string, endsAt: string): string {
  const start = parseDatetimeLocal(startsAt)
  const end = parseDatetimeLocal(endsAt)
  if (!start || !end) return ""
  return `${formatDatetimePickerLabel(start)} – ${formatDatetimePickerLabel(end)}`
}

type RafflePromotionQuickFormProps = {
  form: PromoFormState
  errors: Record<string, string>
  paymentMethods: PaymentMethodOption[]
  priceBs: number
  priceUsd: number
  isEditing: boolean
  isPending: boolean
  onChange: (next: PromoFormState) => void
  onNameChange: (name: string) => void
  onSubmit: () => void
  onCancel: () => void
}

const DURATION_CHIPS: Array<{ value: PromoDurationMode; label: string }> = [
  { value: "permanent", label: "Sin fecha" },
  { value: "24h", label: "24 h" },
  { value: "weekend", label: "Fin de semana" },
  { value: "custom", label: "Elegir fechas" },
]

function ChipButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={selected ? "default" : "outline"}
      className="min-h-11"
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export function RafflePromotionQuickForm({
  form,
  errors,
  paymentMethods,
  priceBs,
  priceUsd,
  isEditing,
  isPending,
  onChange,
  onNameChange,
  onSubmit,
  onCancel,
}: RafflePromotionQuickFormProps) {
  const [moreOptions, setMoreOptions] = useState(Boolean(form.description.trim()))
  const chip = discountChipFromForm(form)
  const preview = previewPromoPrices(form, priceBs, priceUsd)
  const previewLine = formatPriceShiftLine(preview)
  const rangeHint =
    form.duration_mode === "24h" || form.duration_mode === "weekend"
      ? formatDatetimeRangeHint(form.starts_at, form.ends_at)
      : ""

  function setChip(next: DiscountChip) {
    onChange(applyDiscountChip(next, form))
  }

  function setDuration(preset: PromoDurationMode) {
    onChange({
      ...form,
      ...applyDurationPreset(preset, new Date(), form),
    })
  }

  function patchDates(key: "starts_at" | "ends_at", value: string) {
    const nextMode =
      form.duration_mode === "24h" || form.duration_mode === "weekend"
        ? "custom"
        : form.duration_mode === "permanent"
          ? "custom"
          : form.duration_mode
    onChange({ ...form, duration_mode: nextMode, [key]: value })
  }

  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel>Tipo</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <ChipButton selected={chip === "fixed"} onClick={() => setChip("fixed")}>
            Precio fijo
          </ChipButton>
          {PERCENT_CHIPS.map((percent) => (
            <ChipButton
              key={percent}
              selected={chip === String(percent)}
              onClick={() => setChip(String(percent) as DiscountChip)}
            >
              {percent}%
            </ChipButton>
          ))}
          <ChipButton
            selected={chip === "custom_percent"}
            onClick={() => setChip("custom_percent")}
          >
            Otro %
          </ChipButton>
        </div>
      </Field>

      {chip === "custom_percent" ? (
        <Field data-invalid={!!errors.discount_percent}>
          <FieldLabel htmlFor="promo-discount-percent">Porcentaje</FieldLabel>
          <Input
            id="promo-discount-percent"
            type="number"
            min={0.01}
            max={99.99}
            step="0.01"
            inputMode="decimal"
            className="min-h-11"
            value={form.discount_percent}
            onChange={(e) =>
              onChange({ ...form, kind: "percentage", discount_percent: e.target.value })
            }
            aria-invalid={!!errors.discount_percent}
          />
          {errors.discount_percent ? (
            <FieldDescription className="text-destructive">
              {errors.discount_percent}
            </FieldDescription>
          ) : null}
        </Field>
      ) : null}

      {form.kind === "fixed_price" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={!!errors.promo_price_bs}>
            <FieldLabel htmlFor="promo-price-bs">Precio promo (Bs)</FieldLabel>
            <Input
              id="promo-price-bs"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              className="min-h-11"
              value={form.promo_price_bs}
              onChange={(e) => onChange({ ...form, promo_price_bs: e.target.value })}
              aria-invalid={!!errors.promo_price_bs}
            />
            {errors.promo_price_bs ? (
              <FieldDescription className="text-destructive">
                {errors.promo_price_bs}
              </FieldDescription>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="promo-price-usd">Precio promo (USD)</FieldLabel>
            <Input
              id="promo-price-usd"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              className="min-h-11"
              value={form.promo_price_usd}
              onChange={(e) => onChange({ ...form, promo_price_usd: e.target.value })}
            />
          </Field>
        </div>
      ) : null}

      <div className="bg-muted/50 rounded-xl p-3">
        <p className="text-muted-foreground text-xs font-medium">El comprador pagará</p>
        <p
          className={cn(
            "mt-1 text-base font-semibold tabular-nums",
            !previewLine && "text-muted-foreground",
          )}
        >
          {previewLine || `Bs ${priceBs} · $${priceUsd}`}
        </p>
      </div>

      <Field>
        <FieldLabel>Aplica a</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <ChipButton
            selected={form.scope === "all_methods"}
            onClick={() => onChange({ ...form, scope: "all_methods" })}
          >
            Todos los métodos
          </ChipButton>
          <ChipButton
            selected={form.scope === "payment_method"}
            onClick={() => onChange({ ...form, scope: "payment_method" })}
          >
            Un método
          </ChipButton>
        </div>
      </Field>

      {form.scope === "payment_method" ? (
        <Field data-invalid={!!errors.raffle_payment_method_id}>
          <FieldLabel>Método de pago</FieldLabel>
          {paymentMethods.length === 0 ? (
            <FieldDescription>
              Asigna métodos de pago en la configuración de la rifa.
            </FieldDescription>
          ) : (
            <Select
              value={form.raffle_payment_method_id}
              onValueChange={(raffle_payment_method_id) =>
                onChange({ ...form, raffle_payment_method_id })
              }
            >
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue placeholder="Selecciona método" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={String(method.id)}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.raffle_payment_method_id ? (
            <FieldDescription className="text-destructive">
              {errors.raffle_payment_method_id}
            </FieldDescription>
          ) : null}
        </Field>
      ) : null}

      <Field>
        <FieldLabel>Vigencia</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {DURATION_CHIPS.map((item) => (
            <ChipButton
              key={item.value}
              selected={form.duration_mode === item.value}
              onClick={() => setDuration(item.value)}
            >
              {item.label}
            </ChipButton>
          ))}
        </div>
        {rangeHint ? <FieldDescription>{rangeHint}</FieldDescription> : null}
      </Field>

      {form.duration_mode === "custom" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="promo-starts-at">Inicio</FieldLabel>
            <DateTimePicker
              id="promo-starts-at"
              value={form.starts_at}
              onChange={(starts_at) => patchDates("starts_at", starts_at)}
            />
          </Field>
          <Field data-invalid={!!errors.ends_at}>
            <FieldLabel htmlFor="promo-ends-at">Fin</FieldLabel>
            <DateTimePicker
              id="promo-ends-at"
              value={form.ends_at}
              onChange={(ends_at) => patchDates("ends_at", ends_at)}
              aria-invalid={!!errors.ends_at}
            />
            {errors.ends_at ? (
              <FieldDescription className="text-destructive">{errors.ends_at}</FieldDescription>
            ) : null}
          </Field>
        </div>
      ) : null}

      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="promo-name">Nombre</FieldLabel>
        <Input
          id="promo-name"
          className="min-h-11"
          value={form.name}
          onChange={(e) => onNameChange(e.target.value)}
          aria-invalid={!!errors.name}
        />
        {errors.name ? (
          <FieldDescription className="text-destructive">{errors.name}</FieldDescription>
        ) : (
          <FieldDescription>Se genera solo. Cámbialo si quieres.</FieldDescription>
        )}
      </Field>

      <div>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 px-0"
          onClick={() => setMoreOptions((open) => !open)}
        >
          {moreOptions ? "Ocultar opciones" : "Más opciones"}
        </Button>
        {moreOptions ? (
          <Field className="mt-2">
            <FieldLabel htmlFor="promo-description">Descripción (opcional)</FieldLabel>
            <Textarea
              id="promo-description"
              rows={2}
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
            />
          </Field>
        ) : null}
      </div>

      {isEditing ? (
        <Field orientation="horizontal">
          <Switch
            checked={form.is_active}
            onCheckedChange={(is_active) => onChange({ ...form, is_active })}
          />
          <FieldLabel>Promoción activa</FieldLabel>
        </Field>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="min-h-11 flex-1" disabled={isPending} onClick={onSubmit}>
          {isEditing ? "Guardar cambios" : "Activar promoción"}
        </Button>
        <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </FieldGroup>
  )
}
