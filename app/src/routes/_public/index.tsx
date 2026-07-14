import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Search, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { HomeSiteBanner } from "@/features/home/HomeSiteBanner"
import { HomeStickyCta } from "@/features/home/HomeStickyCta"
import { homeFirstActiveQueryOptions } from "@/features/home/home-queries"
import { PublicHomeShell } from "@/features/home/public-home-shell"
import { PublicLayout } from "@/features/layout/PublicLayout"
import {
  buildPublicPageHead,
  siteConfigFromMatches,
  siteNameFromMatches,
} from "@/features/layout/document-head"
import { ensureRaffleLive } from "@/features/layout/public-page-loader"
import { resolvePublicSeo } from "@/features/layout/public-seo"
import type { LivePurchaseActivityVariant } from "@/features/raffle/live-activity-ticker-config"
import { PauseBanner } from "@/features/raffle/PauseBanner"
import { PurchaseForm } from "@/features/raffle/PurchaseForm"
import { RaffleActiveSection } from "@/features/raffle/RaffleActiveSection"
import { buildVerifyHref } from "@/features/verify/build-verify-href"

export const Route = createFileRoute("/_public/")({
  loader: async ({ context: { queryClient } }) => {
    const firstActive = await queryClient
      .ensureQueryData(homeFirstActiveQueryOptions())
      .catch(() => null)

    if (firstActive?.id != null) {
      await ensureRaffleLive(queryClient, firstActive.id)
    }

    return { firstActive }
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
  activeLoading: boolean,
): LivePurchaseActivityVariant | null {
  if (activeLoading && activeRaffle == null) return null
  if (activeRaffle == null) return "idle"
  return activeRaffle.status === "active" || activeRaffle.status === "paused" ? "live" : "finished"
}

function HomePage() {
  const { firstActive } = Route.useLoaderData()

  const activeQuery = useQuery({
    ...homeFirstActiveQueryOptions(),
    initialData: firstActive,
    refetchOnMount: false,
  })

  const activeRaffle = activeQuery.data
  const activeLoading = activeQuery.isFetching && activeRaffle == null

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
              <Skeleton className="-mx-4 aspect-[4/5] w-auto rounded-none sm:mx-0 sm:rounded-xl" />
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
                  Busca tus boletos
                </Link>
              </p>
            </>
          ) : null}
        </div>
      </PublicHomeShell>

      <HomeStickyCta visible={showStickyCta} />
    </PublicLayout>
  )
}
