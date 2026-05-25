import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ActiveRaffleCard } from "@/features/home/ActiveRaffleCard"
import {
  fetchHomeFirstActive,
  fetchHomePublished,
  HOME_PUBLISHED_LIMIT,
  HOME_PUBLISHED_PAGE,
  homeQueryKeys,
} from "@/features/home/home-queries"
import { PublishedRafflesGrid } from "@/features/home/PublishedRafflesGrid"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { useSiteConfig } from "@/stores/site-config"
import { Ticket } from "lucide-react"

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) => {
    const [firstActive, published] = await Promise.all([
      queryClient
        .fetchQuery({
          queryKey: homeQueryKeys.firstActive,
          queryFn: () => fetchHomeFirstActive(),
          staleTime: 30_000,
        })
        .catch(() => null),
      queryClient
        .fetchQuery({
          queryKey: homeQueryKeys.published(HOME_PUBLISHED_LIMIT, HOME_PUBLISHED_PAGE),
          queryFn: () => fetchHomePublished(),
          staleTime: 30_000,
        })
        .catch(() => ({ raffles: [] as never[], totalRows: 0 })),
    ])

    return { firstActive, published }
  },
  component: HomePage,
})

function HomePage() {
  const { firstActive, published: initialPublished } = Route.useLoaderData()
  const { siteInfo } = useSiteConfig()

  const { data: activeRaffle = firstActive } = useQuery({
    queryKey: homeQueryKeys.firstActive,
    queryFn: () => fetchHomeFirstActive(),
    initialData: firstActive,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnMount: false,
  })

  const { data: published = initialPublished } = useQuery({
    queryKey: homeQueryKeys.published(HOME_PUBLISHED_LIMIT, HOME_PUBLISHED_PAGE),
    queryFn: () => fetchHomePublished(),
    initialData: initialPublished,
    staleTime: 30_000,
    refetchOnMount: false,
  })

  return (
    <PublicLayout>
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

      {activeRaffle && (
        <section className="container mx-auto px-4 pb-12">
          <ActiveRaffleCard raffle={activeRaffle} />
        </section>
      )}

      {published.raffles.length > 0 && <PublishedRafflesGrid raffles={published.raffles} />}

      {activeRaffle === null && (
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
