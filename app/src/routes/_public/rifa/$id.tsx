import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Skeleton } from "@/components/ui/skeleton"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { buildPublicPageHead, siteNameFromMatches } from "@/features/layout/document-head"
import { ensureRaffleLive } from "@/features/layout/public-page-loader"
import { LivePurchaseActivityTicker } from "@/features/raffle/LivePurchaseActivityTicker"
import { PauseBanner } from "@/features/raffle/PauseBanner"
import { PrizesSection } from "@/features/raffle/PrizesSection"
import { PurchaseForm } from "@/features/raffle/PurchaseForm"
import { RaffleActiveSection } from "@/features/raffle/RaffleActiveSection"
import { RaffleLiveProvider } from "@/features/raffle/raffle-live-context"
import { raffleDetailQueryOptions } from "@/features/raffle/raffle-queries"
import type { EnrichedRaffle } from "@/server/raffle.service"

export const Route = createFileRoute("/_public/rifa/$id")({
  loader: async ({ params, context: { queryClient } }) => {
    const raffle = await queryClient
      .ensureQueryData(raffleDetailQueryOptions(params.id))
      .catch(() => null)

    if (raffle?.id != null) {
      await ensureRaffleLive(queryClient, raffle.id)
    }

    return { raffle }
  },
  head: ({ matches, loaderData }) => {
    const siteName = siteNameFromMatches(matches, "/_public")
    const raffle = loaderData?.raffle
    const pageTitle = raffle?.name?.trim() || "Rifa no encontrada"
    const description = raffle?.description?.trim() || undefined
    return buildPublicPageHead({
      pageTitle,
      siteName,
      description,
      matches,
    })
  },
  component: RaffleDetailPage,
})

function RaffleDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4">
      <Skeleton className="aspect-[4/5] w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  )
}

function RaffleDetailPage() {
  const { id } = Route.useParams()
  const { raffle: loaderRaffle } = Route.useLoaderData()

  const { data: raffle = loaderRaffle, isError } = useQuery({
    ...raffleDetailQueryOptions(id),
    initialData: (loaderRaffle ?? undefined) as EnrichedRaffle | undefined,
    refetchOnMount: false,
  })

  if (!raffle && !isError) {
    return (
      <PublicLayout>
        <RaffleDetailSkeleton />
      </PublicLayout>
    )
  }

  if (isError || !raffle) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">Rifa no encontrada</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            El enlace puede estar incorrecto o la rifa ya no está disponible.
          </p>
        </div>
      </PublicLayout>
    )
  }

  const liveEnabled = raffle.status === "active" || raffle.status === "paused"

  return (
    <PublicLayout>
      <RaffleLiveProvider raffleId={raffle.id} enabled={liveEnabled}>
        {liveEnabled ? (
          <LivePurchaseActivityTicker variant="live" raffleId={raffle.id} />
        ) : (
          <LivePurchaseActivityTicker variant="finished" />
        )}
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 pt-1 pb-24 sm:gap-4">
          <PauseBanner raffleId={raffle.id} />

          <RaffleActiveSection
            raffle={raffle}
            liveEnabled={liveEnabled}
            headingLevel={1}
            descriptionLineClamp={false}
          >
            {raffle.prizes && raffle.prizes.length > 0 ? (
              <PrizesSection prizes={raffle.prizes} />
            ) : null}

            <div id="comprar" className="scroll-mt-16">
              <PurchaseForm raffle={raffle} />
            </div>
          </RaffleActiveSection>
        </div>
      </RaffleLiveProvider>
    </PublicLayout>
  )
}
