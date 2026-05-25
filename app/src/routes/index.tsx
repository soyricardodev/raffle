import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { useSiteConfig } from "@/stores/site-config"
import { Ticket, Trophy, Clock, ArrowRight } from "lucide-react"

async function fetchFirstActive() {
  const res = await fetch("/api/raffles/first-active")
  if (!res.ok) return null
  return res.json()
}

async function fetchPublished() {
  const res = await fetch("/api/raffles/published?limit=10&page=1")
  if (!res.ok) return { raffles: [] }
  return res.json()
}

export const Route = createFileRoute("/")({
  component: HomePage,
})

function HomePage() {
  const { siteInfo } = useSiteConfig()

  const { data: activeRaffle, isLoading } = useQuery({
    queryKey: ["raffle", "first-active"],
    queryFn: fetchFirstActive,
    refetchInterval: 30_000,
  })

  const { data: published } = useQuery({
    queryKey: ["raffles", "published"],
    queryFn: fetchPublished,
  })

  const progress = activeRaffle
    ? Math.round((Number(activeRaffle.tickets_sold) / Number(activeRaffle.total_tickets)) * 100)
    : 0

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em]">Rifas en línea</p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
            {siteInfo.site_name || "Rifas Premium"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {siteInfo.tagline || "¡Tu oportunidad de ganar!"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {activeRaffle && (
              <Button asChild size="lg">
                <Link to="/rifa/$id" params={{ id: String(activeRaffle.id) }}>
                  Comprar boletos <Ticket className="ml-2" size={18} />
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild size="lg">
              <Link to="/verificar">Verificar boletos</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Rifa activa */}
      {activeRaffle && (
        <section className="container mx-auto px-4 pb-12">
          <Card className="overflow-hidden">
            <CardHeader className="bg-primary/10 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-xl">{activeRaffle.name}</CardTitle>
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  ACTIVA
                </span>
              </div>
              {activeRaffle.description && (
                <p className="text-muted-foreground text-sm">{activeRaffle.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progreso de ventas</span>
                  <span className="font-semibold">{progress}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-secondary">
                  <div
                    className="h-3 rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{activeRaffle.tickets_sold} vendidos</span>
                  <span>{activeRaffle.tickets_available} disponibles</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-secondary p-3">
                  <Ticket size={18} className="mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{activeRaffle.total_tickets}</p>
                  <p className="text-muted-foreground text-xs">Boletos</p>
                </div>
                <div className="rounded-lg bg-secondary p-3">
                  <Trophy size={18} className="mx-auto mb-1 text-amber-500" />
                  <p className="text-lg font-bold">
                    {activeRaffle.prizes?.length ?? activeRaffle.total_prizes ?? 0}
                  </p>
                  <p className="text-muted-foreground text-xs">Premios</p>
                </div>
                <div className="rounded-lg bg-secondary p-3">
                  <Clock size={18} className="mx-auto mb-1 text-blue-500" />
                  <p className="text-lg font-bold">
                    {activeRaffle.days_remaining != null ? `${activeRaffle.days_remaining}d` : "—"}
                  </p>
                  <p className="text-muted-foreground text-xs">Restantes</p>
                </div>
              </div>

              {/* Precios */}
              <div className="flex justify-center gap-6 text-sm">
                <span className="font-semibold">Bs {Number(activeRaffle.price_bs).toFixed(2)}</span>
                <span className="font-semibold">$ {Number(activeRaffle.price_usd).toFixed(2)}</span>
                <span className="text-muted-foreground">por boleto</span>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <Button asChild>
                  <Link to="/rifa/$id" params={{ id: String(activeRaffle.id) }}>
                    Ver rifa <ArrowRight size={16} className="ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Loading state */}
      {isLoading && (
        <section className="container mx-auto px-4 pb-8">
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground animate-pulse">Cargando rifas...</p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Rifas finalizadas */}
      {published && published.raffles?.length > 0 && (
        <section className="container mx-auto px-4 pb-16">
          <h2 className="text-muted-foreground mb-4 text-center text-sm uppercase tracking-[0.2em]">
            Rifas Finalizadas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {published.raffles.slice(0, 6).map((raffle: Record<string, unknown>) => (
              <Card key={raffle.id as number} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{raffle.name as string}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {raffle.tickets_sold as string} de {raffle.total_tickets as string} boletos vendidos
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {raffle.sold_percentage as string}% completado
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!isLoading && !activeRaffle && (
        <section className="container mx-auto px-4 pb-16">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Ticket size={48} className="text-muted-foreground/30 mb-4" />
              <h2 className="mb-2 text-xl font-semibold">No hay rifas activas</h2>
              <p className="text-muted-foreground mb-4 text-sm">
                Vuelve pronto. Mientras tanto puedes verificar tus boletos.
              </p>
              <Button variant="outline" asChild>
                <Link to="/verificar">Verificar boletos</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      )}
    </PublicLayout>
  )
}
