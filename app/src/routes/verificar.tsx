import { createFileRoute } from "@tanstack/react-router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketVerifier } from "@/features/verify/TicketVerifier"
import { PublicLayout } from "@/features/layout/PublicLayout"

export const Route = createFileRoute("/verificar")({
  component: VerifyPage,
})

function VerifyPage() {
  return (
    <PublicLayout>
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Verificar boletos</CardTitle>
            <CardDescription>
              Consulta si tus boletos están registrados en rifas activas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TicketVerifier />
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  )
}
