import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Search, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { HomeSiteBanner } from "@/features/home/HomeSiteBanner"
import { homeRaffleDisplayQueryOptions } from "@/features/home/home-queries"
import { PublicHomeShell } from "@/features/home/public-home-shell"
import {
  buildPublicPageHead,
  siteConfigFromMatches,
  siteNameFromMatches,
} from "@/features/layout/document-head"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { ensureRaffleLive } from "@/features/layout/public-page-loader"
import { resolvePublicSeo } from "@/features/layout/public-seo"
import type { LivePurchaseActivityVariant } from "@/features/raffle/live-activity-ticker-config"
import { PauseBanner } from "@/features/raffle/PauseBanner"
import { PurchaseForm } from "@/features/raffle/PurchaseForm"
import { parsePurchaseRouteSearchInput } from "@/features/raffle/purchase-form/purchase-route-search"
import { RaffleActiveSection } from "@/features/raffle/RaffleActiveSection"
import { RaffleFinishedSection } from "@/features/raffle/RaffleFinishedSection"
import { buildVerifyHref } from "@/features/verify/build-verify-href"

export const Route = createFileRoute("/_public/")({
  validateSearch: (search: Record<string, unknown>) => parsePurchaseRouteSearchInput(search),
  loader: async ({ context: { queryClient } }) => {
    const display = await queryClient
      .ensureQueryData(homeRaffleDisplayQueryOptions())
      .catch(() => ({
        active: null,
        latestFinished: null,
      }))

    if (display.active?.id != null) {
      await ensureRaffleLive(queryClient, display.active.id)
    }

    return { display }
  },
  head: ({ matches }) => {
    const seo = resolvePublicSeo(siteConfigFromMatches(matches, "/_public"))
    const siteName = siteNameFromMatches(matches, "/_public")
    return buildPublicPageHead({
      pageTitle: seo.title || "Rifas",
      siteName,
      matches,
    })
  },
  component: HomePage,
})

function resolveHomeTickerVariant(
  activeRaffle: { status: string } | null | undefined,
  finishedRaffle: { status: string } | null | undefined,
  loading: boolean,
): LivePurchaseActivityVariant | null {
  if (loading && activeRaffle == null && finishedRaffle == null) return null
  if (activeRaffle != null) {
    return activeRaffle.status === "active" || activeRaffle.status === "paused"
      ? "live"
      : "finished"
  }
  if (finishedRaffle != null) return "finished"
  return "idle"
}

function HomePage() {
  const { display: loaderDisplay } = Route.useLoaderData()
  const { norecordar } = Route.useSearch()

  const displayQuery = useQuery({
    ...homeRaffleDisplayQueryOptions(),
    initialData: loaderDisplay,
    refetchOnMount: false,
  })

  const activeRaffle = displayQuery.data?.active ?? null
  const finishedRaffle = displayQuery.data?.latestFinished ?? null
  const loading = displayQuery.isFetching && activeRaffle == null && finishedRaffle == null

  const liveEnabled = activeRaffle?.status === "active" || activeRaffle?.status === "paused"
  const tickerVariant = resolveHomeTickerVariant(activeRaffle, finishedRaffle, loading)
  const shellRaffleId = activeRaffle?.id ?? finishedRaffle?.id

  return (
    <PublicLayout>
      <PublicHomeShell
        tickerVariant={tickerVariant}
        raffleId={shellRaffleId}
        livePollEnabled={activeRaffle != null && liveEnabled}
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 pt-1 pb-24 sm:gap-4">
          <HomeSiteBanner />

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="-mx-4 aspect-[4/5] w-auto rounded-none sm:mx-0 sm:rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-56 w-full rounded-xl" />
            </div>
          ) : null}

          {activeRaffle && !loading ? (
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
                  <PurchaseForm raffle={activeRaffle} rememberBuyer={norecordar !== true} />
                </div>
              </RaffleActiveSection>
            </div>
          ) : null}

          {!activeRaffle && finishedRaffle && !loading ? (
            <RaffleFinishedSection raffle={finishedRaffle} edgeBleed />
          ) : null}

          {!activeRaffle && !finishedRaffle && !loading ? (
            <>
              <Card className="border-dashed shadow-none">
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <Ticket className="text-muted-foreground/40 size-10" />
                  <div className="space-y-1">
                    <p className="font-medium">No hay rifas activas</p>
                    <p className="text-muted-foreground text-sm">
                      Vuelve pronto o busca tus boletos.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="min-h-10" asChild>
                    <Link {...buildVerifyHref()}>
                      <Search className="mr-2 size-4" />
                      Buscar boletos
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              <p className="text-muted-foreground text-center text-sm">
                ¿Ya compraste?{" "}
                <Link
                  {...buildVerifyHref()}
                  className="text-foreground font-medium underline-offset-4 hover:underline"
                >
                  Buscar tus boletos
                </Link>
              </p>
            </>
          ) : null}
        </div>
      </PublicHomeShell>
    </PublicLayout>
  )
}
