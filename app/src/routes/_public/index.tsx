import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ActiveRaffleCard } from "@/features/home/ActiveRaffleCard"
import { HomeRaffleCover } from "@/features/home/HomeRaffleCover"
import { HomeStickyCta } from "@/features/home/HomeStickyCta"
import { homeFirstActiveQueryOptions, homePublishedQueryOptions } from "@/features/home/home-queries"
import { PublishedRafflesGrid } from "@/features/home/PublishedRafflesGrid"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { ensureRaffleLive } from "@/features/layout/public-page-loader"
import { RaffleLiveProvider } from "@/features/raffle/raffle-live-context"
import { PauseBanner } from "@/features/raffle/PauseBanner"
import { PurchaseForm } from "@/features/raffle/PurchaseForm"
import { Search, Ticket } from "lucide-react"

export const Route = createFileRoute("/_public/")({
  loader: async ({ context: { queryClient } }) => {
    const [firstActive, published] = await Promise.all([
      queryClient.ensureQueryData(homeFirstActiveQueryOptions()).catch(() => null),
      queryClient
        .ensureQueryData(homePublishedQueryOptions())
        .catch(() => ({ raffles: [] as never[], totalRows: 0 })),
    ])

    if (firstActive?.id != null) {
      await ensureRaffleLive(queryClient, firstActive.id)
    }

    return { firstActive, published }
  },
  component: HomePage,
})

function HomePage() {
  const { firstActive, published: initialPublished } = Route.useLoaderData()

  const activeQuery = useQuery({
    ...homeFirstActiveQueryOptions(),
    initialData: firstActive,
    refetchOnMount: false,
  })

  const activeRaffle = activeQuery.data
  const activeLoading = activeQuery.isFetching && activeRaffle == null

  const { data: published = initialPublished } = useQuery({
    ...homePublishedQueryOptions(),
    initialData: initialPublished,
    refetchOnMount: false,
  })

  const showStickyCta = activeRaffle != null && activeRaffle.status === "active"

  return (
    <PublicLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-4 pb-24 sm:gap-6 sm:py-6">
        {activeLoading && (
          <div className="space-y-4">
            <Skeleton className="-mx-4 aspect-[4/3] w-auto rounded-none sm:mx-0 sm:rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        )}

        {activeRaffle && (
          <RaffleLiveProvider
            raffleId={activeRaffle.id}
            enabled={activeRaffle.status === "active" || activeRaffle.status === "paused"}
          >
            <div className="space-y-4">
              <PauseBanner raffleId={activeRaffle.id} />
              {activeRaffle.image_url ? (
                <HomeRaffleCover
                  name={activeRaffle.name}
                  imageUrl={activeRaffle.image_url}
                  status={activeRaffle.status}
                />
              ) : null}
              <ActiveRaffleCard
                raffle={activeRaffle}
                variant="compact"
                showCta={false}
                showImage={!activeRaffle.image_url}
                showTitle={!activeRaffle.image_url}
              />
              <div id="comprar" className="scroll-mt-16">
                <PurchaseForm raffle={activeRaffle} />
              </div>
            </div>
          </RaffleLiveProvider>
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
