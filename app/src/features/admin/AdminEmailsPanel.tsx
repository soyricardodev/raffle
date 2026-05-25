import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

export function AdminEmailsPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Emails</h1>
        <p className="text-muted-foreground text-sm">
          Historial y reenvío de correos — requiere jobs Inngest (próxima fase).
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4" />
            Módulo en preparación
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>El backend de emails (logs, reenvío, pruebas) se activará con la integración Inngest.</p>
          <p>Las compras y cambios de estado ya quedan registrados en la base de datos.</p>
        </CardContent>
      </Card>
    </div>
  )
}
