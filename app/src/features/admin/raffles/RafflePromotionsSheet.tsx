import { CaretLeft, Plus, Trash } from "@phosphor-icons/react"
import { promotionScheduleStatus } from "@raffle/shared/promotions"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import {
  buildPromoPayload,
  defaultPromoForm,
  fieldErrorsFromPromoPayload,
  formatPriceShiftLine,
  formatPromoListDetail,
  formFromPromotion,
  methodLabelForForm,
  type PaymentMethodOption,
  type PromoFormState,
  previewFromApiPromo,
  promoStatusLabel,
  promoStatusVariant,
  withSuggestedName,
} from "@/features/admin/raffles/promotion-form-utils"
import { RafflePromotionQuickForm } from "@/features/admin/raffles/RafflePromotionQuickForm"
import type { RafflePromotionApi } from "@/features/raffle/promotion-types"
import { mapApiPromotionToRecord } from "@/features/raffle/promotion-utils"
import { adminFetch, getApiErrorMessage } from "@/lib/admin-fetch"
import { cn } from "@/lib/utils"

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)")
    const onChange = () => setIsDesktop(media.matches)
    onChange()
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  return isDesktop
}

export type PromotionsSheetMode = "list" | "create"

type RafflePromotionsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode: PromotionsSheetMode
  openKey: number
  raffleId: string
  priceBs: number | string
  priceUsd: number | string
  paymentMethods: PaymentMethodOption[]
}

export function rafflePromotionsQueryKey(raffleId: string) {
  return ["admin", "raffle", raffleId, "promotions"] as const
}

export function RafflePromotionsSheet({
  open,
  onOpenChange,
  openKey,
  ...bodyProps
}: RafflePromotionsSheetProps) {
  const isDesktop = useIsDesktop()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <RafflePromotionsSheetBody key={openKey} open={open} isDesktop={isDesktop} {...bodyProps} />
    </Sheet>
  )
}

function RafflePromotionsSheetBody({
  open,
  isDesktop,
  initialMode,
  raffleId,
  priceBs,
  priceUsd,
  paymentMethods,
}: Omit<RafflePromotionsSheetProps, "onOpenChange" | "openKey"> & { isDesktop: boolean }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<"list" | "form">(initialMode === "create" ? "form" : "list")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<PromoFormState>(defaultPromoForm)
  const [nameTouched, setNameTouched] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const baseBs = Number(priceBs)
  const baseUsd = Number(priceUsd)

  const promotionsQuery = useQuery({
    queryKey: rafflePromotionsQueryKey(raffleId),
    queryFn: () => adminFetch<RafflePromotionApi[]>(`/api/admin/raffles/${raffleId}/promotions`),
    enabled: open,
  })

  function invalidatePromoCaches() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "raffle", raffleId] })
    void queryClient.invalidateQueries({ queryKey: rafflePromotionsQueryKey(raffleId) })
  }

  function startCreate() {
    setEditingId(null)
    setForm(defaultPromoForm())
    setNameTouched(false)
    setFormErrors({})
    setView("form")
  }

  function startEdit(promo: RafflePromotionApi) {
    setEditingId(promo.id)
    setForm(formFromPromotion(promo))
    setNameTouched(true)
    setFormErrors({})
    setView("form")
  }

  function goToList() {
    setView("list")
    setEditingId(null)
    setForm(defaultPromoForm())
    setNameTouched(false)
    setFormErrors({})
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPromoPayload(form)
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
      invalidatePromoCaches()
      goToList()
    },
    onError: (err: Error) => toast.error(getApiErrorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      adminFetch<RafflePromotionApi>(`/api/admin/raffles/${raffleId}/promotions/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: (_data, vars) => {
      toast.success(vars.is_active ? "Promoción activada" : "Promoción desactivada")
      invalidatePromoCaches()
    },
    onError: (err: Error) => toast.error(getApiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (promotionId: number) =>
      adminFetch(`/api/admin/raffles/${raffleId}/promotions/${promotionId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Promoción eliminada")
      invalidatePromoCaches()
      setDeleteId(null)
    },
    onError: (err: Error) => toast.error(getApiErrorMessage(err)),
  })

  const list = promotionsQuery.data ?? []
  const isEditing = editingId != null

  function handleFormChange(next: PromoFormState) {
    setForm(withSuggestedName(next, methodLabelForForm(next, paymentMethods), nameTouched))
  }

  function handleSubmit() {
    const errors = fieldErrorsFromPromoPayload(buildPromoPayload(form))
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return
    saveMutation.mutate()
  }

  return (
    <>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "overflow-y-auto",
          isDesktop
            ? "h-dvh max-h-dvh w-full sm:!max-w-md"
            : "max-h-[90vh] rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        )}
      >
        <SheetHeader className="text-left">
          {view === "form" ? (
            <div className="flex items-start gap-2 pr-10">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label="Volver a promociones"
                onClick={goToList}
              >
                <CaretLeft />
              </Button>
              <div className="min-w-0">
                <SheetTitle>{isEditing ? "Editar promoción" : "Nueva promoción"}</SheetTitle>
                <SheetDescription>
                  {isEditing
                    ? "Ajusta el precio promo y guarda."
                    : "Pon el precio promo y actívala."}
                </SheetDescription>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2 pr-10">
              <div>
                <SheetTitle>Promociones</SheetTitle>
                <SheetDescription>Descuentos de precio para esta rifa.</SheetDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 shrink-0"
                onClick={startCreate}
              >
                <Plus data-icon="inline-start" />
                Nueva
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="px-6 pb-4">
          {view === "form" ? (
            <RafflePromotionQuickForm
              key={editingId ?? "new"}
              form={form}
              errors={formErrors}
              paymentMethods={paymentMethods}
              priceBs={baseBs}
              priceUsd={baseUsd}
              isEditing={isEditing}
              isPending={saveMutation.isPending}
              onChange={handleFormChange}
              onNameChange={(name) => {
                setNameTouched(true)
                setForm((prev) => ({ ...prev, name }))
              }}
              onSubmit={handleSubmit}
              onCancel={goToList}
            />
          ) : promotionsQuery.isPending ? (
            <p className="text-muted-foreground text-sm">Cargando promociones…</p>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-muted-foreground text-sm">
                No hay promociones. Crea una en unos toques.
              </p>
              <Button type="button" className="min-h-11" onClick={startCreate}>
                <Plus data-icon="inline-start" />
                Nueva promoción
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {list.map((promo) => {
                const record = mapApiPromotionToRecord(promo)
                const status = promotionScheduleStatus(record)
                const shift = formatPriceShiftLine(previewFromApiPromo(promo, baseBs, baseUsd))
                return (
                  <li key={promo.id} className="flex items-start gap-2 rounded-xl border p-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => startEdit(promo)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{promo.name}</p>
                        <Badge variant={promoStatusVariant(status)}>
                          {promoStatusLabel(status)}
                        </Badge>
                      </div>
                      {shift ? (
                        <p className="mt-1 text-sm font-medium tabular-nums">{shift}</p>
                      ) : null}
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {formatPromoListDetail(promo, paymentMethods)}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <Switch
                        checked={promo.is_active}
                        disabled={toggleMutation.isPending}
                        onCheckedChange={(is_active) =>
                          toggleMutation.mutate({ id: promo.id, is_active })
                        }
                        aria-label={promo.is_active ? "Desactivar promoción" : "Activar promoción"}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="size-11"
                        aria-label="Eliminar promoción"
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
        </div>
      </SheetContent>

      <ConfirmAction
        open={deleteId !== null}
        onOpenChange={(nextOpen) => !nextOpen && setDeleteId(null)}
        title="Eliminar promoción"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId !== null) deleteMutation.mutate(deleteId)
        }}
      />
    </>
  )
}
