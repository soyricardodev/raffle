import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ActiveRaffleCard } from "@/features/home/ActiveRaffleCard"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { ensureRaffleLive } from "@/features/layout/public-page-loader"
import { RaffleLiveProvider } from "@/features/raffle/raffle-live-context"
import { PauseBanner } from "@/features/raffle/PauseBanner"
import { PrizesSection } from "@/features/raffle/PrizesSection"
import { PurchaseForm } from "@/features/raffle/PurchaseForm"
import { raffleDetailQueryOptions } from "@/features/raffle/raffle-queries"
import { Skeleton } from "@/components/ui/skeleton"
import type { EnrichedRaffle } from "@/server/raffle.service"

export const Route = createFileRoute("/_public/rifa/$id")({
  loader: async ({ params, context: { queryClient } }) => {
    const raffle = await queryClient.ensureQueryData(raffleDetailQueryOptions(params.id)).catch(() => null)

    if (raffle?.id != null) {
      await ensureRaffleLive(queryClient, raffle.id)
    }

    return { raffle }
  },
  component: RaffleDetailPage,
})

function RaffleDetailSkeleton() {
  return (
    <div className="container mx-auto space-y-4 px-4 py-8">
      <Skeleton className="aspect-[16/9] w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
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
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Rifa no encontrada</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            El enlace puede estar incorrecto o la rifa ya no está disponible.
          </p>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <RaffleLiveProvider
        raffleId={raffle.id}
        enabled={raffle.status === "active" || raffle.status === "paused"}
      >
        <div className="container mx-auto space-y-6 px-4 py-8">
          <PauseBanner raffleId={raffle.id} />
          <ActiveRaffleCard raffle={raffle} />
          <PrizesSection prizes={raffle.prizes} />
          <div id="comprar" className="scroll-mt-20">
            <PurchaseForm raffle={raffle} />
          </div>
        </div>
      </RaffleLiveProvider>
    </PublicLayout>
  )
}
