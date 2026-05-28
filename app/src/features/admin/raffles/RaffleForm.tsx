import { Plus, Trash } from "@phosphor-icons/react"
import { PaymentMethod, PLATFORM_TOTAL_TICKETS } from "@raffle/shared/validators"
import { useState } from "react"
import type { CreateRaffleInput, UpdateRaffleInput } from "@raffle/shared/validators"
import type { RaffleFormState } from "@/features/admin/raffles/types"
import { defaultPrize } from "@/features/admin/raffles/types"
import { AdminImageUploadField } from "@/features/admin/shared/AdminImageUploadField"
import { PaymentMethodsEditor } from "@/features/admin/PaymentMethodsEditor"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type RaffleFormProps = {
  mode: "create" | "edit"
  title: string
  description?: string
  initial: RaffleFormState
  isPending?: boolean
  onSubmit: (payload: CreateRaffleInput | UpdateRaffleInput) => void
  onCancel?: () => void
}

function buildPayload(state: RaffleFormState): CreateRaffleInput {
  return {
    name: state.name.trim(),
    description: state.description.trim() || undefined,
    image_url: state.imageUrl,
    total_tickets: PLATFORM_TOTAL_TICKETS,
    price_bs: Number(state.priceBs),
    price_usd: Number(state.priceUsd),
    min_purchase: Number(state.minPurchase),
    max_purchase: Number(state.maxPurchase),
    draw_date: state.drawDateEnabled && state.drawDate
      ? new Date(state.drawDate).toISOString()
      : null,
    status: state.status,
    auto_pause_enabled: true,
    prizes: state.prizes
      .filter((prize) => prize.name.trim())
      .map((prize, index) => ({
        name: prize.name.trim(),
        description: prize.description.trim() || undefined,
        image_url: prize.image_url ?? undefined,
        position: prize.position || index + 1,
      })),
    payment_methods: state.methods.map((method) => ({
      method_type: PaymentMethod.parse(method.method_type),
      account_info: method.account_info,
      min_tickets: method.min_tickets.trim()
        ? Number(method.min_tickets)
        : null,
      is_active: true,
    })),
  }
}

export function RaffleForm({
  mode,
  title,
  description,
  initial,
  isPending = false,
  onSubmit,
  onCancel,
}: RaffleFormProps) {
  const [state, setState] = useState<RaffleFormState>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function patch<K extends keyof RaffleFormState>(key: K, value: RaffleFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!state.name.trim()) next.name = "El nombre es obligatorio"
    if (!state.priceBs || Number(state.priceBs) <= 0) next.priceBs = "Precio Bs inválido"
    if (!state.priceUsd || Number(state.priceUsd) <= 0) next.priceUsd = "Precio USD inválido"
    if (state.methods.length === 0) next.methods = "Agrega al menos un método de pago"
    if (state.drawDateEnabled && !state.drawDate) {
      next.drawDate = "Indica la fecha del sorteo o desactívala"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    onSubmit(buildPayload(state))
  }

  const prizeCount = state.prizes.filter((p) => p.name.trim()).length

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-24 lg:pb-8">
      <AdminPageHeader title={title} description={description} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Información pública</CardTitle>
              <CardDescription>
                Lo que verán los compradores en la página de la rifa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="raffle-name">Nombre de la rifa</FieldLabel>
                  <Input
                    id="raffle-name"
                    className="min-h-11"
                    value={state.name}
                    onChange={(e) => patch("name", e.target.value)}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name ? (
                    <FieldDescription className="text-destructive">{errors.name}</FieldDescription>
                  ) : null}
                </Field>

                <Field>
                  <FieldLabel htmlFor="raffle-description">Descripción</FieldLabel>
                  <Textarea
                    id="raffle-description"
                    className="min-h-24"
                    value={state.description}
                    onChange={(e) => patch("description", e.target.value)}
                    placeholder="Detalles, condiciones o información adicional…"
                  />
                </Field>

                <AdminImageUploadField
                  id="raffle-cover"
                  label="Imagen principal"
                  description="Portada de la rifa en la página pública."
                  kind="raffles"
                  value={state.imageUrl}
                  onChange={(url) => patch("imageUrl", url)}
                  disabled={isPending}
                />
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precios y compra</CardTitle>
              <CardDescription>Límites por pedido del comprador.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={!!errors.priceBs}>
                    <FieldLabel htmlFor="price-bs">Precio por boleto (Bs)</FieldLabel>
                    <Input
                      id="price-bs"
                      type="number"
                      min={0}
                      step="0.01"
                      className="min-h-11"
                      value={state.priceBs}
                      onChange={(e) => patch("priceBs", e.target.value)}
                    />
                  </Field>
                  <Field data-invalid={!!errors.priceUsd}>
                    <FieldLabel htmlFor="price-usd">Precio por boleto (USD)</FieldLabel>
                    <Input
                      id="price-usd"
                      type="number"
                      min={0}
                      step="0.01"
                      className="min-h-11"
                      value={state.priceUsd}
                      onChange={(e) => patch("priceUsd", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="min-purchase">Compra mínima (boletos)</FieldLabel>
                    <Input
                      id="min-purchase"
                      type="number"
                      min={1}
                      className="min-h-11"
                      value={state.minPurchase}
                      onChange={(e) => patch("minPurchase", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="max-purchase">Compra máxima (boletos)</FieldLabel>
                    <Input
                      id="max-purchase"
                      type="number"
                      min={1}
                      className="min-h-11"
                      value={state.maxPurchase}
                      onChange={(e) => patch("maxPurchase", e.target.value)}
                    />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>Premios</CardTitle>
                <CardDescription>Ordenados por posición. Puedes agregar imagen a cada uno.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 shrink-0"
                onClick={() =>
                  patch("prizes", [...state.prizes, defaultPrize(state.prizes.length + 1)])
                }
              >
                <Plus data-icon="inline-start" />
                Agregar
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {state.prizes.map((prize, index) => (
                <div key={index} className="flex flex-col gap-4 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary">Premio {index + 1}</Badge>
                    {state.prizes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11"
                        aria-label="Eliminar premio"
                        onClick={() =>
                          patch(
                            "prizes",
                            state.prizes.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Trash />
                      </Button>
                    )}
                  </div>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor={`prize-name-${index}`}>Nombre</FieldLabel>
                      <Input
                        id={`prize-name-${index}`}
                        className="min-h-11"
                        value={prize.name}
                        onChange={(e) =>
                          patch(
                            "prizes",
                            state.prizes.map((item, i) =>
                              i === index ? { ...item, name: e.target.value } : item,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`prize-desc-${index}`}>Descripción</FieldLabel>
                      <Textarea
                        id={`prize-desc-${index}`}
                        value={prize.description}
                        onChange={(e) =>
                          patch(
                            "prizes",
                            state.prizes.map((item, i) =>
                              i === index ? { ...item, description: e.target.value } : item,
                            ),
                          )
                        }
                      />
                    </Field>
                    <AdminImageUploadField
                      id={`prize-image-${index}`}
                      label="Imagen del premio"
                      kind="prizes"
                      value={prize.image_url}
                      onChange={(url) =>
                        patch(
                          "prizes",
                          state.prizes.map((item, i) =>
                            i === index ? { ...item, image_url: url } : item,
                          ),
                        )
                      }
                      disabled={isPending}
                    />
                  </FieldGroup>
                </div>
              ))}
            </CardContent>
          </Card>

          <div data-invalid={!!errors.methods}>
            <PaymentMethodsEditor
              methods={state.methods}
              onChange={(methods) => patch("methods", methods)}
            />
            {errors.methods ? (
              <p className="text-destructive mt-2 text-sm">{errors.methods}</p>
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Publicación y sorteo</CardTitle>
              <CardDescription>
                Por defecto el sorteo es indefinido (hasta vender todos los boletos).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="raffle-status">Estado inicial</FieldLabel>
                  <Select
                    value={state.status}
                    onValueChange={(value) =>
                      patch("status", value as RaffleFormState["status"])
                    }
                  >
                    <SelectTrigger id="raffle-status" className="min-h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="active">Activa</SelectItem>
                      {mode === "edit" ? (
                        <>
                          <SelectItem value="paused">Pausada</SelectItem>
                          <SelectItem value="finished">Finalizada</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </>
                      ) : null}
                    </SelectContent>
                  </Select>
                </Field>

                <Separator />

                <Field orientation="horizontal">
                  <div className="flex flex-1 flex-col gap-1">
                    <FieldLabel htmlFor="draw-date-toggle">Fecha de sorteo definida</FieldLabel>
                    <FieldDescription>
                      Si está desactivado, la rifa corre hasta agotar boletos.
                    </FieldDescription>
                  </div>
                  <Switch
                    id="draw-date-toggle"
                    checked={state.drawDateEnabled}
                    onCheckedChange={(checked) => patch("drawDateEnabled", checked)}
                  />
                </Field>

                {state.drawDateEnabled ? (
                  <Field data-invalid={!!errors.drawDate}>
                    <FieldLabel htmlFor="draw-date">Fecha y hora del sorteo</FieldLabel>
                    <Input
                      id="draw-date"
                      type="datetime-local"
                      className="min-h-11"
                      value={state.drawDate}
                      onChange={(e) => patch("drawDate", e.target.value)}
                      aria-invalid={!!errors.drawDate}
                    />
                    {errors.drawDate ? (
                      <FieldDescription className="text-destructive">
                        {errors.drawDate}
                      </FieldDescription>
                    ) : null}
                  </Field>
                ) : null}
              </FieldGroup>
            </CardContent>
            <CardFooter className="hidden flex-wrap gap-2 border-t lg:flex">
              {onCancel ? (
                <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>
                  Cancelar
                </Button>
              ) : null}
              <Button
                type="button"
                className="min-h-11"
                disabled={isPending || !state.name.trim()}
                onClick={handleSubmit}
              >
                {isPending
                  ? "Guardando…"
                  : mode === "create"
                    ? "Crear rifa"
                    : "Guardar cambios"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">Plataforma</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-2xl font-semibold tabular-nums">
                  {PLATFORM_TOTAL_TICKETS.toLocaleString("es-VE")}
                </p>
                <p className="text-muted-foreground text-sm">boletos por rifa</p>
                <p className="text-muted-foreground mt-2 text-xs">Numeración fija 0000 → 9999</p>
              </div>
              <Badge variant="outline" className="w-fit">
                No editable
              </Badge>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p className="font-medium">{state.name.trim() || "Sin nombre"}</p>
              <p className="text-muted-foreground">
                {prizeCount} premio{prizeCount === 1 ? "" : "s"} · {state.methods.length} método
                {state.methods.length === 1 ? "" : "s"} de pago
              </p>
              <p className="text-muted-foreground tabular-nums">
                Bs {state.priceBs} · USD {state.priceUsd}
              </p>
              <p className="text-muted-foreground text-xs">
                Sorteo:{" "}
                {state.drawDateEnabled && state.drawDate
                  ? new Date(state.drawDate).toLocaleString("es-VE")
                  : "Hasta vender todo"}
              </p>
              {state.imageUrl ? (
                <img
                  src={state.imageUrl}
                  alt=""
                  className="mt-2 aspect-video w-full rounded-lg object-cover"
                />
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>

      <div
        className={cn(
          "bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t p-4 backdrop-blur lg:hidden",
        )}
      >
        <div className="mx-auto flex max-w-lg gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onCancel}>
              Cancelar
            </Button>
          ) : null}
          <Button
            type="button"
            className="min-h-11 flex-1"
            disabled={isPending || !state.name.trim()}
            onClick={handleSubmit}
          >
            {isPending ? "Guardando…" : mode === "create" ? "Crear rifa" : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  )
}
