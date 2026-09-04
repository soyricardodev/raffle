import { CaretDownIcon, CaretUpIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"
import type { PushAutoAlert } from "@raffle/shared/push"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { moveItemInList } from "@/features/admin/payment-methods/move-item-in-list"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import {
  type AdminPushListResponse,
  adminPushQueryKeys,
} from "@/features/admin/push/admin-push-queries"
import {
  draftFromPushAutoAlert,
  duplicatePercentMessage,
  findDuplicatePercentAlert,
  orderedAlertIds,
  parsePercentDraft,
  type PushAutoAlertDraft,
} from "@/features/admin/push/push-auto-alert-validation"
import { adminFetch } from "@/lib/admin-fetch"
import { cn } from "@/lib/utils"

const TITLE_MAX = 80
const BODY_MAX = 180

function emptyDraft(): PushAutoAlertDraft {
  return { triggerPercent: "50", title: "", body: "", enabled: true }
}

function remainingLabel(used: number, max: number) {
  const left = Math.max(0, max - used)
  return `${left} caracter${left === 1 ? "" : "es"}`
}

function triggerLabel(alert: PushAutoAlert, draft: PushAutoAlertDraft): string {
  if (alert.kind === "new_raffle") return "Al publicar"
  const percent = parsePercentDraft(draft.triggerPercent)
  return percent != null ? `Al ${percent}%` : "Por porcentaje"
}

type PercentFieldProps = {
  id: string
  label?: string
  value: string
  duplicateMessage: string | null
  onChange: (value: string) => void
}

function PercentField({ id, label = "Porcentaje", value, duplicateMessage, onChange }: PercentFieldProps) {
  return (
    <Field data-invalid={duplicateMessage != null}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        className="mt-1.5"
        type="number"
        min={1}
        max={100}
        inputMode="numeric"
        aria-invalid={duplicateMessage != null}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {duplicateMessage ? <FieldError className="mt-1.5">{duplicateMessage}</FieldError> : null}
    </Field>
  )
}

export function AdminPushAutoAlerts({
  loading,
  alerts,
}: {
  loading: boolean
  alerts: PushAutoAlert[] | undefined
}) {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<number, PushAutoAlertDraft>>({})
  const [newDraft, setNewDraft] = useState<PushAutoAlertDraft | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const sortedAlerts = useMemo(
    () => [...(alerts ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [alerts],
  )
  const pinnedAlerts = useMemo(
    () => sortedAlerts.filter((alert) => alert.kind === "new_raffle"),
    [sortedAlerts],
  )
  const percentAlerts = useMemo(
    () => sortedAlerts.filter((alert) => alert.kind === "percent"),
    [sortedAlerts],
  )

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: adminPushQueryKeys.list })

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) =>
      adminFetch<PushAutoAlert[]>("/api/admin/push/alerts", {
        method: "PUT",
        body: JSON.stringify({ ordered_ids: orderedIds }),
      }),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: adminPushQueryKeys.list })
      const previous = queryClient.getQueryData<AdminPushListResponse>(adminPushQueryKeys.list)
      if (previous) {
        const byId = new Map(previous.autoAlerts.map((alert) => [alert.id, alert]))
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((alert): alert is PushAutoAlert => alert != null)
        queryClient.setQueryData(adminPushQueryKeys.list, {
          ...previous,
          autoAlerts: reordered,
        })
      }
      return { previous }
    },
    onSuccess: () => {
      toast.success("Orden actualizado")
      invalidate()
    },
    onError: (error: Error, _orderedIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminPushQueryKeys.list, context.previous)
      }
      toast.error(error.message)
    },
  })

  const createMutation = useMutation({
    mutationFn: (draft: PushAutoAlertDraft) => {
      const triggerPercent = Number(draft.triggerPercent)
      return adminFetch<PushAutoAlert>("/api/admin/push/alerts", {
        method: "POST",
        body: JSON.stringify({
          triggerPercent,
          title: draft.title.trim(),
          body: draft.body.trim(),
          enabled: draft.enabled,
        }),
      })
    },
    onSuccess: () => {
      setNewDraft(null)
      toast.success("Aviso automático agregado")
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      draft,
      kind,
    }: {
      id: number
      draft: PushAutoAlertDraft
      kind: PushAutoAlert["kind"]
    }) => {
      const payload: Record<string, unknown> = {
        title: draft.title.trim(),
        body: draft.body.trim(),
        enabled: draft.enabled,
      }
      if (kind === "percent") {
        payload.triggerPercent = Number(draft.triggerPercent)
      }
      return adminFetch<PushAutoAlert>(`/api/admin/push/alerts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (_result, variables) => {
      setDrafts((current) => {
        const next = { ...current }
        delete next[variables.id]
        return next
      })
      toast.success("Aviso actualizado")
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      adminFetch<{ ok: true }>(`/api/admin/push/alerts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleteId(null)
      toast.success("Aviso eliminado")
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function getDraft(alert: PushAutoAlert): PushAutoAlertDraft {
    return drafts[alert.id] ?? draftFromPushAutoAlert(alert)
  }

  function patchDraft(id: number, alert: PushAutoAlert, patch: Partial<PushAutoAlertDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...getDraft(alert), ...patch },
    }))
  }

  function duplicatePercentError(
    percent: number | null,
    excludeId?: number,
    enabled = true,
  ): string | null {
    if (!enabled || percent == null) return null
    const duplicate = findDuplicatePercentAlert({
      alerts: sortedAlerts,
      drafts,
      percent,
      excludeId,
    })
    return duplicate ? duplicatePercentMessage(percent) : null
  }

  function isDirty(alert: PushAutoAlert): boolean {
    const draft = drafts[alert.id]
    if (!draft) return false
    const original = draftFromPushAutoAlert(alert)
    return (
      draft.title !== original.title ||
      draft.body !== original.body ||
      draft.enabled !== original.enabled ||
      draft.triggerPercent !== original.triggerPercent
    )
  }

  function canSave(alert: PushAutoAlert): boolean {
    const draft = getDraft(alert)
    if (!draft.title.trim()) return false
    if (alert.kind === "percent") {
      const percent = parsePercentDraft(draft.triggerPercent)
      if (percent == null) return false
      if (duplicatePercentError(percent, alert.id, draft.enabled)) return false
    }
    return isDirty(alert)
  }

  const newPercent = newDraft ? parsePercentDraft(newDraft.triggerPercent) : null
  const newDuplicateError = newDraft
    ? duplicatePercentError(newPercent, undefined, newDraft.enabled)
    : null

  const canCreate =
    newDraft != null &&
    newDraft.title.trim().length > 0 &&
    newPercent != null &&
    !newDuplicateError

  function movePercentAlert(index: number, delta: -1 | 1) {
    const nextPercent = moveItemInList(percentAlerts, index, delta)
    if (nextPercent === percentAlerts) return
    reorderMutation.mutate(orderedAlertIds([...pinnedAlerts, ...nextPercent]))
  }

  function renderAlertCard(
    alert: PushAutoAlert,
    options?: {
      reorderIndex?: number
      reorderCount?: number
    },
  ) {
    const draft = getDraft(alert)
    const dirty = isDirty(alert)
    const percent = alert.kind === "percent" ? parsePercentDraft(draft.triggerPercent) : null
    const percentDuplicateError =
      alert.kind === "percent"
        ? duplicatePercentError(percent, alert.id, draft.enabled)
        : null
    const reorderIndex = options?.reorderIndex
    const canMoveUp = reorderIndex != null && reorderIndex > 0
    const canMoveDown =
      reorderIndex != null &&
      options?.reorderCount != null &&
      reorderIndex < options.reorderCount - 1

    return (
      <div
        key={alert.id}
        className={cn(
          "rounded-2xl border p-3",
          !draft.enabled && "bg-muted/30 opacity-80",
          percentDuplicateError && "border-destructive/40",
        )}
      >
        <div className="flex items-start gap-3">
          {alert.kind === "percent" && reorderIndex != null ? (
            <div className="flex shrink-0 flex-col items-center pt-0.5">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={`Subir aviso al ${percent ?? alert.triggerPercent}%`}
                disabled={!canMoveUp || reorderMutation.isPending}
                onClick={() => movePercentAlert(reorderIndex, -1)}
              >
                <CaretUpIcon className="size-4" />
              </Button>
              <span className="text-muted-foreground py-0.5 text-[11px] font-semibold tabular-nums">
                {reorderIndex + 1}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={`Bajar aviso al ${percent ?? alert.triggerPercent}%`}
                disabled={!canMoveDown || reorderMutation.isPending}
                onClick={() => movePercentAlert(reorderIndex, 1)}
              >
                <CaretDownIcon className="size-4" />
              </Button>
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{triggerLabel(alert, draft)}</p>
              <div className="flex items-center gap-2">
                <Label htmlFor={`alert-enabled-${alert.id}`} className="text-xs">
                  {draft.enabled ? "Activo" : "Apagado"}
                </Label>
                <Switch
                  id={`alert-enabled-${alert.id}`}
                  checked={draft.enabled}
                  onCheckedChange={(checked) => {
                    patchDraft(alert.id, alert, { enabled: checked })
                    if (!dirty && checked !== alert.enabled) {
                      updateMutation.mutate({
                        id: alert.id,
                        draft: { ...draft, enabled: checked },
                        kind: alert.kind,
                      })
                    }
                  }}
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3">
              {alert.kind === "percent" ? (
                <PercentField
                  id={`alert-percent-${alert.id}`}
                  value={draft.triggerPercent}
                  duplicateMessage={percentDuplicateError}
                  onChange={(value) => patchDraft(alert.id, alert, { triggerPercent: value })}
                />
              ) : null}

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <Label htmlFor={`alert-title-${alert.id}`}>Título</Label>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {remainingLabel(draft.title.length, TITLE_MAX)}
                  </span>
                </div>
                <Input
                  id={`alert-title-${alert.id}`}
                  className="mt-1.5"
                  maxLength={TITLE_MAX}
                  value={draft.title}
                  onChange={(event) => patchDraft(alert.id, alert, { title: event.target.value })}
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <Label htmlFor={`alert-body-${alert.id}`}>Mensaje</Label>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {remainingLabel(draft.body.length, BODY_MAX)}
                  </span>
                </div>
                <Textarea
                  id={`alert-body-${alert.id}`}
                  className="mt-1.5 min-h-20"
                  maxLength={BODY_MAX}
                  value={draft.body}
                  placeholder="Si lo dejas vacío, se usa el nombre de la rifa."
                  onChange={(event) => patchDraft(alert.id, alert, { body: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {dirty ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={!canSave(alert) || updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: alert.id, draft, kind: alert.kind })}
                >
                  Guardar
                </Button>
              ) : null}
              {alert.kind === "percent" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(alert.id)}
                >
                  <TrashIcon data-icon="inline-start" />
                  Eliminar
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Avisos automáticos</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Configura el %, el texto y el orden. Usa las flechas en cada aviso por porcentaje.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={loading || newDraft != null}
            onClick={() => setNewDraft(emptyDraft())}
          >
            <PlusIcon data-icon="inline-start" />
            Agregar
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Cargando avisos…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pinnedAlerts.map((alert) => renderAlertCard(alert))}
            {percentAlerts.map((alert, index) =>
              renderAlertCard(alert, {
                reorderIndex: index,
                reorderCount: percentAlerts.length,
              }),
            )}

            {newDraft ? (
              <div
                className={cn(
                  "rounded-2xl border border-dashed p-3",
                  newDuplicateError && "border-destructive/40",
                )}
              >
                <p className="text-sm font-medium">Nuevo aviso por porcentaje</p>
                <div className="mt-3 grid gap-3">
                  <PercentField
                    id="new-alert-percent"
                    value={newDraft.triggerPercent}
                    duplicateMessage={newDuplicateError}
                    onChange={(value) => setNewDraft({ ...newDraft, triggerPercent: value })}
                  />
                  <div>
                    <Label htmlFor="new-alert-title">Título</Label>
                    <Input
                      id="new-alert-title"
                      className="mt-1.5"
                      maxLength={TITLE_MAX}
                      value={newDraft.title}
                      onChange={(event) => setNewDraft({ ...newDraft, title: event.target.value })}
                      placeholder="Último 50% disponible."
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-alert-body">Mensaje</Label>
                    <Textarea
                      id="new-alert-body"
                      className="mt-1.5 min-h-20"
                      maxLength={BODY_MAX}
                      value={newDraft.body}
                      placeholder="Si lo dejas vacío, se usa el nombre de la rifa."
                      onChange={(event) => setNewDraft({ ...newDraft, body: event.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canCreate || createMutation.isPending}
                    onClick={() => createMutation.mutate(newDraft)}
                  >
                    Crear aviso
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setNewDraft(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>

      <ConfirmAction
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Eliminar aviso automático"
        description="Este aviso dejará de enviarse en rifas futuras. Los que ya salieron no se borran del historial."
        confirmLabel={deleteMutation.isPending ? "Eliminando…" : "Eliminar"}
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId != null) deleteMutation.mutate(deleteId)
        }}
      />
    </Card>
  )
}
