import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { buildPublicPageHead } from "@/features/layout/document-head"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { TicketVerifier } from "@/features/verify/TicketVerifier"
import { VerifyPageHelp } from "@/features/verify/VerifyPageHelp"
import { parseVerifyRouteSearchInput } from "@/features/verify/verify-route-search"

export const Route = createFileRoute("/_public/verificar")({
  validateSearch: (search: Record<string, unknown>) => parseVerifyRouteSearchInput(search),
  head: ({ matches }) =>
    buildPublicPageHead({
      pageTitle: "Buscar boletos",
      description:
        "Busca tus números registrados y revisa si tu compra fue aprobada o rechazada.",
      matches,
    }),
  component: VerifyPage,
})

function VerifyPage() {
  const search = Route.useSearch()

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-lg px-4 py-6 pb-24">
        <header className="mb-6 space-y-3">
          <Button variant="link" size="sm" className="text-muted-foreground h-auto px-0 text-xs" asChild>
            <Link to="/" hash="comprar">
              ← Comprar boletos
            </Link>
          </Button>

          <div className="space-y-2">
            <div className="bg-primary/10 text-primary inline-flex size-11 items-center justify-center rounded-2xl">
              <MagnifyingGlassIcon className="size-6" weight="duotone" aria-hidden />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Buscar boletos</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Encuentra tus números registrados y revisa si tu compra fue aprobada o rechazada.
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Busca por teléfono, cédula, correo electrónico o número de boleto.
            </p>
          </div>
        </header>

        <TicketVerifier initialSearch={search} />

        <div className="mt-8">
          <VerifyPageHelp />
        </div>
      </div>
    </PublicLayout>
  )
}
