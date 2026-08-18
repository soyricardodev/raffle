import { emptyAccountInfoDraft, PAYMENT_METHOD_DEFINITIONS } from "@raffle/shared/payment-methods"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { adminNavTitle } from "@/features/admin/nav"
import { moveItemInList } from "@/features/admin/payment-methods/move-item-in-list"
import { PaymentAccountCard } from "@/features/admin/payment-methods/PaymentAccountCard"
import {
  PaymentAccountForm,
  type PaymentAccountFormValues,
} from "@/features/admin/payment-methods/PaymentAccountForm"
import type { AdminPaymentAccount } from "@/features/admin/payment-methods/types"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { adminFetch, getApiErrorMessage } from "@/lib/admin-fetch"

const QUERY_KEY = ["admin", "payment-accounts"]

type PaymentAccountUsage = {
  raffles: Array<{ id: number; name: string }>
  promotions: Array<{ id: number; name: string; raffle_id: number; is_active: boolean }>
}

function DeletePaymentAccountDescription({
  accountLabel,
  usage,
  loading,
}: {
  accountLabel: string | undefined
  usage: PaymentAccountUsage | undefined
  loading: boolean
}) {
  if (loading) {
    return <span>Revisando en qué rifas está asignado…</span>
  }

  if (!usage || usage.raffles.length === 0) {
    return (
      <span>
        {accountLabel ? (
          <>
            <strong>{accountLabel}</strong> no está asignado a ninguna rifa. Se eliminará del
            catálogo.
          </>
        ) : (
          "Este método no está asignado a ninguna rifa. Se eliminará del catálogo."
        )}
      </span>
    )
  }

  return (
    <span className="block space-y-3 text-left">
      <span className="block">
        {accountLabel ? (
          <>
            <strong>{accountLabel}</strong> está asignado a{" "}
            {usage.raffles.length === 1 ? "una rifa" : `${usage.raffles.length} rifas`}:
          </>
        ) : (
          <>
            Este método está asignado a{" "}
            {usage.raffles.length === 1 ? "una rifa" : `${usage.raffles.length} rifas`}:
          </>
        )}
      </span>
      <ul className="list-disc space-y-1 pl-5">
        {usage.raffles.map((raffle) => (
          <li key={raffle.id}>
            {raffle.name} (#{raffle.id})
          </li>
        ))}
      </ul>
      {usage.promotions.length > 0 ? (
        <>
          <span className="block">
            También se desactivarán {usage.promotions.length}{" "}
            {usage.promotions.length === 1 ? "promoción" : "promociones"} que dependen de este
            método:
          </span>
          <ul className="list-disc space-y-1 pl-5">
            {usage.promotions.map((promotion) => (
              <li key={promotion.id}>
                {promotion.name} (rifa #{promotion.raffle_id})
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <span className="block">
        Puedes quitarlo de esas rifas y eliminarlo del catálogo en un solo paso.
      </span>
    </span>
  )
}

function defaultFormValues(): PaymentAccountFormValues {
  return {
    label: "",
    method_type: "pago_movil",
    account_info: emptyAccountInfoDraft("pago_movil"),
    is_active: true,
  }
}

export function PaymentAccountsView() {
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<AdminPaymentAccount | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const accountsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => adminFetch<AdminPaymentAccount[]>("/api/admin/payment-accounts"),
  })

  const deleteTarget = accountsQuery.data?.find((account) => account.id === deleteId)

  const usageQuery = useQuery({
    queryKey: ["admin", "payment-account-usage", deleteId],
    queryFn: () => adminFetch<PaymentAccountUsage>(`/api/admin/payment-accounts/${deleteId}/usage`),
    enabled: deleteId !== null,
  })

  const hasRaffleUsage = (usageQuery.data?.raffles.length ?? 0) > 0

  const saveMutation = useMutation({
    mutationFn: async (values: PaymentAccountFormValues) => {
      const body = {
        label: values.label,
        method_type: values.method_type,
        account_info: values.account_info,
        is_active: values.is_active,
      }
      if (editing) {
        return adminFetch(`/api/admin/payment-accounts/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        })
      }
      return adminFetch("/api/admin/payment-accounts/", {
        method: "POST",
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      toast.success(editing ? "Método actualizado" : "Método creado")
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      setSheetOpen(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(getApiErrorMessage(e)),
  })

  const reorderMutation = useMutation({
    mutationFn: (next: AdminPaymentAccount[]) =>
      adminFetch("/api/admin/payment-accounts/", {
        method: "PUT",
        body: JSON.stringify({ ordered_ids: next.map((account) => account.id) }),
      }),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<AdminPaymentAccount[]>(QUERY_KEY)
      queryClient.setQueryData(QUERY_KEY, next)
      return { previous }
    },
    onSuccess: () => {
      toast.success("Orden actualizado")
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (e: Error, _orderedIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous)
      }
      toast.error(getApiErrorMessage(e))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: number; force?: boolean }) =>
      adminFetch(`/api/admin/payment-accounts/${id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.force
          ? "Método quitado de las rifas y eliminado del catálogo"
          : "Método eliminado",
      )
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ["admin", "raffles"] })
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(getApiErrorMessage(e)),
  })

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(account: AdminPaymentAccount) {
    setEditing(account)
    setSheetOpen(true)
  }

  const formInitial: PaymentAccountFormValues = editing
    ? {
        label: editing.label,
        method_type: editing.method_type,
        account_info: editing.account_info,
        is_active: editing.is_active,
      }
    : defaultFormValues()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 pb-24">
      <AdminPageHeader
        title={adminNavTitle("/admin/metodos-pago")}
        description="Cuentas reutilizables. El orden de esta lista es el que ven los compradores; el primero queda seleccionado por defecto."
      />

      <div className="flex justify-end">
        <Button type="button" className="min-h-11" onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" />
          Nuevo método
        </Button>
      </div>

      {accountsQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : accountsQuery.data?.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            No hay métodos guardados.{" "}
            <button type="button" className="text-primary underline" onClick={openCreate}>
              Crea el primero
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {accountsQuery.data?.map((account, index, accounts) => (
            <PaymentAccountCard
              key={account.id}
              account={account}
              index={index}
              isFirst={index === 0}
              isLast={index === accounts.length - 1}
              reorderPending={reorderMutation.isPending}
              onMove={(delta) => {
                const next = moveItemInList(accounts, index, delta)
                if (next === accounts) return
                reorderMutation.mutate(next)
              }}
              onEdit={() => openEdit(account)}
              onDelete={() => setDeleteId(account.id)}
            />
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-center text-sm">
        <Link to="/admin/crear" className="text-primary underline">
          Crear rifa
        </Link>{" "}
        para asignar métodos a una rifa activa.
      </p>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar método" : "Nuevo método de pago"}</SheetTitle>
            <SheetDescription>Datos que verá el comprador al pagar.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <PaymentAccountForm
              key={editing?.id ?? "new"}
              initial={formInitial}
              allowLegacyTypes={Boolean(
                editing?.method_type && PAYMENT_METHOD_DEFINITIONS[editing.method_type].legacy,
              )}
              isPending={saveMutation.isPending}
              onCancel={() => setSheetOpen(false)}
              onSubmit={(v) => saveMutation.mutate(v)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmAction
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={hasRaffleUsage ? "Quitar de rifas y eliminar" : "Eliminar método de pago"}
        description={
          <DeletePaymentAccountDescription
            accountLabel={deleteTarget?.label}
            usage={usageQuery.data}
            loading={usageQuery.isLoading}
          />
        }
        confirmLabel={hasRaffleUsage ? "Quitar y eliminar" : "Eliminar"}
        destructive
        pending={deleteMutation.isPending || usageQuery.isLoading}
        onConfirm={() => {
          if (deleteId === null || usageQuery.isLoading) return
          deleteMutation.mutate({ id: deleteId, force: hasRaffleUsage })
        }}
      />
    </div>
  )
}
