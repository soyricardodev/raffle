import { GearIcon } from "@phosphor-icons/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AdminUserPreferencesCard() {
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
              Las operaciones administrativas se aplican al seleccionarlas, sin pasos de confirmación.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Los formularios que solicitan datos adicionales, como el motivo de rechazo, se mantienen.
      </CardContent>
    </Card>
  )
}
