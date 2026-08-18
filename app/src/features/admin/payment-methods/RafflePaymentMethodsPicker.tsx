import { PAYMENT_METHOD_DEFINITIONS, summarizeAccountInfo } from "@raffle/shared/payment-methods"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdminPaymentAccount } from "@/features/admin/payment-methods/types"
import type { PaymentMethodAssignment } from "@/features/admin/raffles/types"
import { adminFetch } from "@/lib/admin-fetch"
import { cn } from "@/lib/utils"

type RafflePaymentMethodsPickerProps = {
  assignments: Array<PaymentMethodAssignment>
  onChange: (assignments: Array<PaymentMethodAssignment>) => void
}

export function RafflePaymentMethodsPicker({
  assignments,
  onChange,
}: RafflePaymentMethodsPickerProps) {
  const accountsQuery = useQuery({
    queryKey: ["admin", "payment-accounts", "active"],
    queryFn: () => adminFetch<AdminPaymentAccount[]>("/api/admin/payment-accounts?active=true"),
  })

  const selectedIds = new Set(assignments.map((a) => a.account_id))

  function toggleAccount(accountId: number) {
    if (selectedIds.has(accountId)) {
      onChange(assignments.filter((a) => a.account_id !== accountId))
      return
    }
    onChange([
      ...assignments,
      { account_id: accountId, min_tickets: "", min_reference_length: "", is_active: true },
    ])
  }

  function updateAssignment(accountId: number, patch: Partial<PaymentMethodAssignment>) {
    onChange(assignments.map((a) => (a.account_id === accountId ? { ...a, ...patch } : a)))
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Métodos de pago</CardTitle>
          <CardDescription>
            Elige cuentas ya configuradas. El orden y el método por defecto se definen en{" "}
            <Link to="/admin/metodos-pago" className="text-primary underline">
              Métodos de pago
            </Link>
            .
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {accountsQuery.isLoading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : accountsQuery.data?.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            No hay métodos activos.{" "}
            <Link to="/admin/metodos-pago" className="text-primary underline">
              Crea uno primero
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {accountsQuery.data?.map((account) => {
              const selected = selectedIds.has(account.id)
              const assignment = assignments.find((a) => a.account_id === account.id)
              const def = PAYMENT_METHOD_DEFINITIONS[account.method_type]
              return (
                <div
                  key={account.id}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    selected && "border-primary bg-primary/5",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full min-h-11 items-start gap-3 text-left"
                    onClick={() => toggleAccount(account.id)}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                        selected && "border-primary bg-primary text-primary-foreground",
                      )}
                      aria-hidden
                    >
                      {selected ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{account.label}</span>
                      <span className="text-muted-foreground mt-0.5 block text-sm">
                        {def.label} ·{" "}
                        {summarizeAccountInfo(account.method_type, account.account_info)}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          {def.currency === "USD" ? "USD" : "Bs"}
                        </Badge>
                      </span>
                    </span>
                  </button>

                  {selected && assignment ? (
                    <div className="mt-3 flex flex-col gap-3 border-t pt-3">
                      <Field>
                        <FieldLabel htmlFor={`min-${account.id}`}>Mínimo de boletos</FieldLabel>
                        <Input
                          id={`min-${account.id}`}
                          type="number"
                          min={1}
                          placeholder="Sin mínimo"
                          className="min-h-11"
                          value={assignment.min_tickets}
                          onChange={(e) =>
                            updateAssignment(account.id, { min_tickets: e.target.value })
                          }
                        />
                        <FieldDescription>
                          El comprador solo podrá usar este método si compra al menos esta cantidad.
                        </FieldDescription>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`ref-min-${account.id}`}>
                          Mínimo de caracteres (referencia)
                        </FieldLabel>
                        <Input
                          id={`ref-min-${account.id}`}
                          type="number"
                          min={1}
                          max={100}
                          placeholder="8 (predeterminado)"
                          className="min-h-11"
                          value={assignment.min_reference_length}
                          onChange={(e) =>
                            updateAssignment(account.id, { min_reference_length: e.target.value })
                          }
                        />
                        <FieldDescription>
                          Longitud mínima de la referencia de pago para este método. Déjalo vacío
                          para usar 8 caracteres.
                        </FieldDescription>
                      </Field>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        {assignments.length === 0 && accountsQuery.data && accountsQuery.data.length > 0 ? (
          <p className="text-muted-foreground text-sm">Selecciona al menos un método.</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
