import { GearIcon } from "@phosphor-icons/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useAdminUserPreferences } from "@/features/admin/preferences/use-admin-user-preferences"

function PreferenceSwitch({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex w-full items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

export function AdminUserPreferencesCard() {
  const { preferences, isLoading, isUpdating, updatePurchasePreference } = useAdminUserPreferences()

  return (
    <Card className="border-border/80">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
            <GearIcon className="size-5" weight="duotone" />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">Preferencias</CardTitle>
            <CardDescription>
              Personaliza tu experiencia en el panel. Los cambios se guardan automáticamente.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <FieldGroup className="gap-6">
            <Field>
              <PreferenceSwitch
                id="skip-approve-confirm"
                label="Aprobar compras sin confirmación"
                description="Al aprobar una compra desde la lista o el detalle, se ejecutará de inmediato."
                checked={preferences.purchases.skipApproveConfirm}
                disabled={isUpdating}
                onCheckedChange={(checked) =>
                  updatePurchasePreference("skipApproveConfirm", checked)
                }
              />
            </Field>
            <Field>
              <PreferenceSwitch
                id="skip-ticket-adjust-confirm"
                label="Ajustar boletos sin confirmación"
                description="Al actualizar la cantidad o reasignar boletos, se aplicará el cambio sin pedir confirmación."
                checked={preferences.purchases.skipTicketAdjustConfirm}
                disabled={isUpdating}
                onCheckedChange={(checked) =>
                  updatePurchasePreference("skipTicketAdjustConfirm", checked)
                }
              />
            </Field>
            <p className="text-muted-foreground text-sm">
              Rechazar compras siempre pedirá confirmación para que puedas indicar un motivo
              opcional.
            </p>
          </FieldGroup>
        )}
      </CardContent>
    </Card>
  )
}
