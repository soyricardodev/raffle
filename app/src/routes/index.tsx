import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ActiveRaffleCard } from "@/features/home/ActiveRaffleCard"
import { HomeHero } from "@/features/home/HomeHero"
import { HomeStickyCta } from "@/features/home/HomeStickyCta"
import {
  fetchHomeFirstActive,
  fetchHomePublished,
  HOME_PUBLISHED_LIMIT,
  HOME_PUBLISHED_PAGE,
  homeQueryKeys,
} from "@/features/home/home-queries"
import { PublishedRafflesGrid } from "@/features/home/PublishedRafflesGrid"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { PauseBanner } from "@/features/raffle/PauseBanner"
import { PurchaseForm } from "@/features/raffle/PurchaseForm"
import { Search, Ticket } from "lucide-react"

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

  const activeQuery = useQuery({
    queryKey: homeQueryKeys.firstActive,
    queryFn: () => fetchHomeFirstActive(),
    initialData: firstActive,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnMount: false,
  })

  const activeRaffle = activeQuery.data
  const activeLoading = activeQuery.isFetching && activeRaffle == null

  const { data: published = initialPublished } = useQuery({
    queryKey: homeQueryKeys.published(HOME_PUBLISHED_LIMIT, HOME_PUBLISHED_PAGE),
    queryFn: () => fetchHomePublished(),
    initialData: initialPublished,
    staleTime: 30_000,
    refetchOnMount: false,
  })

  const showStickyCta = activeRaffle != null && activeRaffle.status === "active"

  return (
    <PublicLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-6 pb-24 sm:py-8">
        <HomeHero />

        {activeLoading && (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        )}

        {activeRaffle && (
          <div className="space-y-6">
            {activeRaffle.status === "paused" && <PauseBanner raffleId={activeRaffle.id} />}
            <ActiveRaffleCard raffle={activeRaffle} variant="compact" showCta={false} />
            <div id="comprar" className="scroll-mt-16">
              <PurchaseForm raffle={activeRaffle} />
            </div>
          </div>
        )}

        {activeRaffle === null && !activeLoading && (
          <Card className="border-dashed shadow-none">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Ticket className="text-muted-foreground/40 size-10" />
              <div className="space-y-1">
                <p className="font-medium">No hay rifas activas</p>
                <p className="text-muted-foreground text-sm">Vuelve pronto o verifica tus boletos.</p>
              </div>
              <Button variant="outline" size="sm" className="min-h-10" asChild>
                <Link to="/verificar">
                  <Search className="mr-2 size-4" />
                  Verificar boletos
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-muted-foreground text-center text-sm">
          ¿Ya compraste?{" "}
          <Link to="/verificar" className="text-foreground font-medium underline-offset-4 hover:underline">
            Verifica tus boletos
          </Link>
        </p>
      </div>

      {published.raffles.length > 0 && (
        <div className="border-t">
          <PublishedRafflesGrid raffles={published.raffles} />
        </div>
      )}

      <HomeStickyCta visible={showStickyCta} />
    </PublicLayout>
  )
}
