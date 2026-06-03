import { Plus, Trash } from "@phosphor-icons/react"
import { promotionScheduleStatus } from "@raffle/shared/promotions"
import type { PromotionRecord } from "@raffle/shared/promotions/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { adminFetch } from "@/lib/admin-fetch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { RafflePromotionApi } from "@/features/raffle/promotion-types"
import { mapApiPromotionToRecord } from "@/features/raffle/promotion-utils"
import { cn } from "@/lib/utils"

type PaymentMethodOption = {
  id: number
  label: string
}

type PromoFormState = {
  name: string
  description: string
  is_active: boolean
  kind: "fixed_price" | "percentage"
  scope: "all_methods" | "payment_method"
  raffle_payment_method_id: string
  promo_price_bs: string
  promo_price_usd: string
  discount_percent: string
  duration_mode: "permanent" | "scheduled"
  starts_at: string
  ends_at: string
}

const defaultForm = (): PromoFormState => ({
  name: "",
  description: "",
  is_active: true,
  kind: "percentage",
  scope: "all_methods",
  raffle_payment_method_id: "",
  promo_price_bs: "",
  promo_price_usd: "",
  discount_percent: "20",
  duration_mode: "scheduled",
  starts_at: "",
  ends_at: "",
})

function statusLabel(status: ReturnType<typeof promotionScheduleStatus>): string {
  switch (status) {
    case "active":
      return "Activa"
    case "scheduled":
      return "Programada"
    case "expired":
      return "Vencida"
    default:
      return "Inactiva"
  }
}

function statusVariant(status: ReturnType<typeof promotionScheduleStatus>) {
  switch (status) {
    case "active":
      return "default" as const
    case "scheduled":
      return "secondary" as const
    case "expired":
      return "outline" as const
    default:
      return "destructive" as const
  }
}

function buildPayload(state: PromoFormState) {
  return {
    name: state.name.trim(),
    description: state.description.trim() || null,
    is_active: state.is_active,
    kind: state.kind,
    scope: state.scope,
    raffle_payment_method_id:
      state.scope === "payment_method" && state.raffle_payment_method_id
        ? Number(state.raffle_payment_method_id)
        : null,
    promo_price_bs: state.promo_price_bs.trim() ? Number(state.promo_price_bs) : null,
    promo_price_usd: state.promo_price_usd.trim() ? Number(state.promo_price_usd) : null,
    discount_percent: state.discount_percent.trim()
      ? Number(state.discount_percent)
      : null,
    starts_at:
      state.duration_mode === "scheduled" && state.starts_at
        ? new Date(state.starts_at).toISOString()
        : null,
    ends_at:
      state.duration_mode === "scheduled" && state.ends_at
        ? new Date(state.ends_at).toISOString()
        : null,
  }
}

type RafflePromotionsPanelProps = {
  raffleId: string
  priceBs: number | string
  priceUsd: number | string
  paymentMethods: PaymentMethodOption[]
}

export function RafflePromotionsPanel({
  raffleId,
  priceBs,
  priceUsd,
  paymentMethods,
}: RafflePromotionsPanelProps) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<PromoFormState>(defaultForm)

  const promotionsQuery = useQuery({
    queryKey: ["admin", "raffle", raffleId, "promotions"],
    queryFn: () =>
      adminFetch<RafflePromotionApi[]>(`/api/admin/raffles/${raffleId}/promotions`),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form)
      if (editingId) {
        return adminFetch<RafflePromotionApi>(
          `/api/admin/raffles/${raffleId}/promotions/${editingId}`,
          { method: "PUT", body: JSON.stringify(payload) },
        )
      }
      return adminFetch<RafflePromotionApi>(`/api/admin/raffles/${raffleId}/promotions`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast.success(editingId ? "Promoción actualizada" : "Promoción creada")
      void queryClient.invalidateQueries({ queryKey: ["admin", "raffle", raffleId] })
      void queryClient.invalidateQueries({
        queryKey: ["admin", "raffle", raffleId, "promotions"],
      })
      setFormOpen(false)
      setEditingId(null)
      setForm(defaultForm())
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (promotionId: number) =>
      adminFetch(`/api/admin/raffles/${raffleId}/promotions/${promotionId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Promoción eliminada")
      void queryClient.invalidateQueries({ queryKey: ["admin", "raffle", raffleId] })
      void queryClient.invalidateQueries({
        queryKey: ["admin", "raffle", raffleId, "promotions"],
      })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const baseBs = Number(priceBs)
  const baseUsd = Number(priceUsd)

  const previewRecord = useMemo((): PromotionRecord | null => {
    if (!form.name.trim()) return null
    try {
      const payload = buildPayload(form)
      return mapApiPromotionToRecord({
        id: -1,
        raffle_id: Number(raffleId),
        name: payload.name as string,
        description: payload.description as string | null,
        is_active: payload.is_active as boolean,
        kind: payload.kind as "fixed_price" | "percentage",
        scope: payload.scope as "all_methods" | "payment_method",
        raffle_payment_method_id: payload.raffle_payment_method_id as number | null,
        promo_price_bs: payload.promo_price_bs as number | null,
        promo_price_usd: payload.promo_price_usd as number | null,
        discount_percent: payload.discount_percent as number | null,
        starts_at: payload.starts_at as string | null,
        ends_at: payload.ends_at as string | null,
      })
    } catch {
      return null
    }
  }, [form, raffleId])

  function startEdit(promo: RafflePromotionApi) {
    setEditingId(promo.id)
    setForm({
      name: promo.name,
      description: promo.description ?? "",
      is_active: promo.is_active,
      kind: promo.kind,
      scope: promo.scope,
      raffle_payment_method_id: promo.raffle_payment_method_id
        ? String(promo.raffle_payment_method_id)
        : "",
      promo_price_bs: promo.promo_price_bs != null ? String(promo.promo_price_bs) : "",
      promo_price_usd: promo.promo_price_usd != null ? String(promo.promo_price_usd) : "",
      discount_percent:
        promo.discount_percent != null ? String(promo.discount_percent) : "",
      duration_mode: promo.starts_at || promo.ends_at ? "scheduled" : "permanent",
      starts_at: promo.starts_at ? promo.starts_at.slice(0, 16) : "",
      ends_at: promo.ends_at ? promo.ends_at.slice(0, 16) : "",
    })
    setFormOpen(true)
  }

  function patch<K extends keyof PromoFormState>(key: K, value: PromoFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const list = promotionsQuery.data ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Promociones</CardTitle>
          <CardDescription>
            Precios promocionales, descuentos por método y vigencia temporal.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 shrink-0"
          onClick={() => {
            setEditingId(null)
            setForm(defaultForm())
            setFormOpen((v) => !v)
          }}
        >
          <Plus data-icon="inline-start" />
          {formOpen && !editingId ? "Cerrar" : "Nueva"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {formOpen ? (
          <div className="rounded-xl border p-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Nombre</FieldLabel>
                <Input
                  value={form.name}
                  onChange={(e) => patch("name", e.target.value)}
                  placeholder="Ej: Fin de semana 20% off"
                />
              </Field>
              <Field>
                <FieldLabel>Descripción (opcional)</FieldLabel>
                <Textarea
                  value={form.description}
                  onChange={(e) => patch("description", e.target.value)}
                  rows={2}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Tipo</FieldLabel>
                  <Select
                    value={form.kind}
                    onValueChange={(v) => patch("kind", v as PromoFormState["kind"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje de descuento</SelectItem>
                      <SelectItem value="fixed_price">Precio fijo promocional</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Alcance</FieldLabel>
                  <Select
                    value={form.scope}
                    onValueChange={(v) => patch("scope", v as PromoFormState["scope"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_methods">Todos los métodos</SelectItem>
                      <SelectItem value="payment_method">Método específico</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {form.scope === "payment_method" ? (
                <Field>
                  <FieldLabel>Método de pago</FieldLabel>
                  <Select
                    value={form.raffle_payment_method_id}
                    onValueChange={(v) => patch("raffle_payment_method_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona método" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              {form.kind === "percentage" ? (
                <Field>
                  <FieldLabel>Descuento (%)</FieldLabel>
                  <Input
                    type="number"
                    min={0.01}
                    max={99.99}
                    step="0.01"
                    value={form.discount_percent}
                    onChange={(e) => patch("discount_percent", e.target.value)}
                  />
                </Field>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Precio promo (Bs)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.promo_price_bs}
                      onChange={(e) => patch("promo_price_bs", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Precio promo (USD)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.promo_price_usd}
                      onChange={(e) => patch("promo_price_usd", e.target.value)}
                    />
                  </Field>
                </div>
              )}
              <Field>
                <FieldLabel>Vigencia</FieldLabel>
                <Select
                  value={form.duration_mode}
                  onValueChange={(v) =>
                    patch("duration_mode", v as PromoFormState["duration_mode"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Siempre (sin fecha fin)</SelectItem>
                    <SelectItem value="scheduled">Rango de fechas</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.duration_mode === "scheduled" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Inicio (opcional)</FieldLabel>
                    <Input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(e) => patch("starts_at", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Fin (opcional)</FieldLabel>
                    <Input
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={(e) => patch("ends_at", e.target.value)}
                    />
                  </Field>
                </div>
              ) : null}
              <Field orientation="horizontal">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => patch("is_active", v)}
                />
                <FieldLabel>Promoción activa</FieldLabel>
              </Field>
              {previewRecord ? (
                <div className="bg-muted/50 rounded-lg p-3 text-xs">
                  <p className="font-medium">Vista previa</p>
                  <p className="text-muted-foreground mt-1">
                    Base: Bs {baseBs} · ${baseUsd}
                    {form.kind === "fixed_price" && form.promo_price_bs
                      ? ` → Promo Bs ${form.promo_price_bs}`
                      : null}
                    {form.kind === "fixed_price" && form.promo_price_usd
                      ? ` → Promo $${form.promo_price_usd}`
                      : null}
                    {form.kind === "percentage" && form.discount_percent
                      ? ` → ${form.discount_percent}% menos`
                      : null}
                  </p>
                  <p className="mt-1">
                    Estado:{" "}
                    <Badge variant={statusVariant(promotionScheduleStatus(previewRecord))}>
                      {statusLabel(promotionScheduleStatus(previewRecord))}
                    </Badge>
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {editingId ? "Guardar cambios" : "Crear promoción"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => {
                    setFormOpen(false)
                    setEditingId(null)
                    setForm(defaultForm())
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </FieldGroup>
          </div>
        ) : null}

        {promotionsQuery.isPending ? (
          <p className="text-muted-foreground text-sm">Cargando promociones…</p>
        ) : list.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay promociones configuradas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((promo) => {
              const record = mapApiPromotionToRecord(promo)
              const status = promotionScheduleStatus(record)
              return (
                <li
                  key={promo.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{promo.name}</p>
                      <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                    </div>
                    <FieldDescription className="mt-1">
                      {promo.kind === "percentage"
                        ? `${promo.discount_percent}% · ${promo.scope === "all_methods" ? "Global" : "Por método"}`
                        : `Precio fijo · ${promo.scope === "all_methods" ? "Global" : "Por método"}`}
                      {promo.ends_at
                        ? ` · hasta ${new Date(promo.ends_at).toLocaleString("es-VE")}`
                        : " · sin fecha fin"}
                    </FieldDescription>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(promo)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(promo.id)}
                    >
                      <Trash />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <ConfirmAction
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Eliminar promoción"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId !== null) deleteMutation.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </Card>
  )
}
