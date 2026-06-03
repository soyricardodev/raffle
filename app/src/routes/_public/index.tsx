import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Search, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { HomeSiteBanner } from "@/features/home/HomeSiteBanner"
import { HomeStickyCta } from "@/features/home/HomeStickyCta"
import {
  homeFirstActiveQueryOptions,
  homePublishedQueryOptions,
} from "@/features/home/home-queries"
import { PublishedRafflesGrid } from "@/features/home/PublishedRafflesGrid"
import { PublicHomeShell } from "@/features/home/public-home-shell"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { ensureRaffleLive } from "@/features/layout/public-page-loader"
import type { LivePurchaseActivityVariant } from "@/features/raffle/live-activity-ticker-config"
import { PauseBanner } from "@/features/raffle/PauseBanner"
import { PurchaseForm } from "@/features/raffle/PurchaseForm"
import { RaffleActiveSection } from "@/features/raffle/RaffleActiveSection"

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

function resolveHomeTickerVariant(
  activeRaffle: { status: string } | null | undefined,
  activeLoading: boolean,
): LivePurchaseActivityVariant | null {
  if (activeLoading && activeRaffle == null) return null
  if (activeRaffle == null) return "idle"
  return activeRaffle.status === "active" || activeRaffle.status === "paused" ? "live" : "finished"
}

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
  const liveEnabled = activeRaffle?.status === "active" || activeRaffle?.status === "paused"
  const tickerVariant = resolveHomeTickerVariant(activeRaffle, activeLoading)

  return (
    <PublicLayout>
      <PublicHomeShell
        tickerVariant={tickerVariant}
        raffleId={activeRaffle?.id}
        livePollEnabled={activeRaffle != null && liveEnabled}
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 pt-1 pb-24 sm:gap-4">
          <HomeSiteBanner />

          {activeRaffle && activeLoading ? (
            <div className="space-y-3">
              <Skeleton className="-mx-4 aspect-[4/3] w-auto rounded-none sm:mx-0 sm:rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-56 w-full rounded-xl" />
            </div>
          ) : null}

          {activeRaffle && !activeLoading ? (
            <div className="space-y-3">
              <PauseBanner raffleId={activeRaffle.id} />
              <RaffleActiveSection
                raffle={activeRaffle}
                liveEnabled={liveEnabled}
                edgeBleed
                headingLevel={1}
                descriptionLineClamp={5}
              >
                <div id="comprar" className="scroll-mt-16">
                  <PurchaseForm raffle={activeRaffle} />
                </div>
              </RaffleActiveSection>
            </div>
          ) : null}

          {!activeRaffle && !activeLoading ? (
            <>
              <Card className="border-dashed shadow-none">
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <Ticket className="text-muted-foreground/40 size-10" />
                  <div className="space-y-1">
                    <p className="font-medium">No hay rifas activas</p>
                    <p className="text-muted-foreground text-sm">
                      Vuelve pronto o verifica tus boletos.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="min-h-10" asChild>
                    <Link to="/verificar">
                      <Search className="mr-2 size-4" />
                      Verificar boletos
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              <p className="text-muted-foreground text-center text-sm">
                ¿Ya compraste?{" "}
                <Link
                  to="/verificar"
                  className="text-foreground font-medium underline-offset-4 hover:underline"
                >
                  Verifica tus boletos
                </Link>
              </p>
            </>
          ) : null}
        </div>
      </PublicHomeShell>

      {published.raffles.length > 0 && (
        <div className="border-t">
          <PublishedRafflesGrid raffles={published.raffles} />
        </div>
      )}

      <HomeStickyCta visible={showStickyCta} />
    </PublicLayout>
  )
}
