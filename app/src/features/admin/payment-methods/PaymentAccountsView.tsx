import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Plus, Pencil, Trash } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  emptyAccountInfoDraft,
  PAYMENT_METHOD_DEFINITIONS,
  summarizeAccountInfo,
} from "@raffle/shared/payment-methods"
import type { PaymentMethod } from "@raffle/shared/validators"
import {
  PaymentAccountForm,
  type PaymentAccountFormValues,
} from "@/features/admin/payment-methods/PaymentAccountForm"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { adminFetch } from "@/lib/admin-fetch"

type PaymentAccount = {
  id: number
  label: string
  method_type: PaymentMethod
  account_info: Record<string, string>
  is_active: boolean
}

const QUERY_KEY = ["admin", "payment-accounts"]

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
  const [editing, setEditing] = useState<PaymentAccount | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const accountsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => adminFetch<PaymentAccount[]>("/api/admin/payment-accounts"),
  })

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
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      adminFetch(`/api/admin/payment-accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Método eliminado")
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(account: PaymentAccount) {
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
        title="Métodos de pago"
        description="Cuentas reutilizables. Asígnalas al crear o editar una rifa."
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
          {accountsQuery.data?.map((account) => {
            const def = PAYMENT_METHOD_DEFINITIONS[account.method_type]
            return (
              <Card key={account.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{account.label}</CardTitle>
                    <CardDescription className="truncate">
                      {summarizeAccountInfo(account.method_type, account.account_info)}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11"
                      aria-label="Editar"
                      onClick={() => openEdit(account)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11"
                      aria-label="Eliminar"
                      onClick={() => setDeleteId(account.id)}
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 pt-0">
                  <Badge variant="secondary">{def.label}</Badge>
                  <Badge variant="outline">
                    {def.currency === "USD" ? "USD" : "Bs"}
                  </Badge>
                  {!account.is_active ? <Badge variant="outline">Inactivo</Badge> : null}
                </CardContent>
              </Card>
            )
          })}
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
              allowLegacyTypes={Boolean(editing?.method_type && PAYMENT_METHOD_DEFINITIONS[editing.method_type].legacy)}
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
        title="Eliminar método de pago"
        description="Solo puedes eliminar métodos que no estén asignados a ninguna rifa."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (deleteId !== null) deleteMutation.mutate(deleteId)
        }}
      />
    </div>
  )
}
