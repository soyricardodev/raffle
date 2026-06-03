import { createFileRoute } from "@tanstack/react-router"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { TicketVerifier } from "@/features/verify/TicketVerifier"

export const Route = createFileRoute("/_public/verificar")({
  component: VerifyPage,
})

function VerifyPage() {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-lg px-4 py-6 pb-24">
        <header className="mb-6 space-y-2">
          <div className="bg-primary/10 text-primary inline-flex size-11 items-center justify-center rounded-2xl">
            <MagnifyingGlassIcon className="size-6" weight="duotone" aria-hidden />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Verificar boletos</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Confirma que tus números estén registrados y revisa el estado de tu compra en segundos.
          </p>
        </header>

        <TicketVerifier />
      </div>
    </PublicLayout>
  )
}
