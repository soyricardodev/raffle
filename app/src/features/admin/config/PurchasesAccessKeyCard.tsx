import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  adminPurchasesAccessQueryKey,
  adminPurchasesAccessQueryOptions,
  updatePurchasesAccessKeyFn,
} from "@/features/admin/purchases/admin-purchases-access-queries"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { getApiErrorMessage } from "@/lib/api-error-message"

export function PurchasesAccessKeyCard() {
  const queryClient = useQueryClient()
  const [key, setKey] = useState("")
  const [confirmClear, setConfirmClear] = useState(false)
  const accessQuery = useQuery(adminPurchasesAccessQueryOptions())
  const configured = Boolean(accessQuery.data?.configured)

  const saveMutation = useMutation({
    mutationFn: (nextKey: string | null) => updatePurchasesAccessKeyFn({ data: { key: nextKey } }),
    onSuccess: async (result) => {
      setKey("")
      setConfirmClear(false)
      toast.success(result.configured ? "Clave de acceso guardada" : "Clave de acceso quitada")
      await queryClient.invalidateQueries({ queryKey: adminPurchasesAccessQueryKey })
      await queryClient.invalidateQueries({ queryKey: ["admin", "config"] })
    },
    onError: (error: Error) => toast.error(getApiErrorMessage(error)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clave de acceso</CardTitle>
        <CardDescription>
          Clave extra solo para entrar al módulo de Compras. No se muestra después de guardarla.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <p className="text-muted-foreground text-sm">
            {configured
              ? "Hay una clave activa. Quien entre a Compras tendrá que escribirla."
              : "Sin clave: el módulo queda abierto para cualquier administrador."}
          </p>
          <Field>
            <FieldLabel htmlFor="purchases-access-config-key">
              {configured ? "Nueva clave" : "Clave"}
            </FieldLabel>
            <Input
              id="purchases-access-config-key"
              className="min-h-11"
              type="password"
              autoComplete="new-password"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              disabled={saveMutation.isPending}
            />
            <FieldDescription>
              Mínimo 4 caracteres. Quien ya había entrado tendrá que volver a escribirla.
            </FieldDescription>
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="min-h-11 sm:flex-1"
              type="button"
              disabled={!key.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate(key)}
            >
              {saveMutation.isPending && key.trim() ? "Guardando…" : "Guardar clave"}
            </Button>
            {configured ? (
              <Button
                className="min-h-11 sm:flex-1"
                type="button"
                variant="outline"
                disabled={saveMutation.isPending}
                onClick={() => setConfirmClear(true)}
              >
                Quitar clave
              </Button>
            ) : null}
          </div>
        </FieldGroup>
      </CardContent>
      <ConfirmAction
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Quitar clave de acceso"
        description="El módulo de Compras quedará abierto para cualquier administrador con sesión."
        confirmLabel="Quitar"
        pending={saveMutation.isPending}
        destructive
        onConfirm={() => saveMutation.mutate(null)}
      />
    </Card>
  )
}
