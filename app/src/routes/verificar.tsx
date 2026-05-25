import { createFileRoute } from "@tanstack/react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PublicLayout } from "@/features/layout/PublicLayout"

export const Route = createFileRoute("/verificar")({
  component: VerifyPage,
})

function VerifyPage() {
  return (
    <PublicLayout>
      <div className="container mx-auto max-w-lg px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Verificar boletos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Formulario de verificación — pendiente T-308 (TicketVerifier).
            </p>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  )
}
