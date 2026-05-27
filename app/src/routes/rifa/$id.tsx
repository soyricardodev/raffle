import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ActiveRaffleCard } from "@/features/home/ActiveRaffleCard"
import { PauseBanner } from "@/features/raffle/PauseBanner"
import { PrizesSection } from "@/features/raffle/PrizesSection"
import { PurchaseForm } from "@/features/raffle/PurchaseForm"
import { fetchRaffleById, raffleQueryKeys } from "@/features/raffle/raffle-queries"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { Skeleton } from "@/components/ui/skeleton"
import type { EnrichedRaffle } from "@/server/raffle.service"

export const Route = createFileRoute("/rifa/$id")({
  loader: async ({ params, context: { queryClient } }) => {
    const raffle = await queryClient
      .fetchQuery({
        queryKey: raffleQueryKeys.detail(params.id),
        queryFn: () => fetchRaffleById({ data: { id: params.id } }),
        staleTime: 30_000,
      })
      .catch(() => null)

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

  const { data: raffle = loaderRaffle, isError, isFetching } = useQuery({
    queryKey: raffleQueryKeys.detail(id),
    queryFn: () => fetchRaffleById({ data: { id } }),
    initialData: (loaderRaffle ?? undefined) as EnrichedRaffle | undefined,
    staleTime: 30_000,
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

  const prizes = (raffle.prizes ?? []) as Array<{
    name: string
    description?: string | null
    position?: number | string
    image_url?: string | null
  }>

  return (
    <PublicLayout>
      <div className="container mx-auto space-y-6 px-4 py-8">
        {isFetching && (
          <p className="text-muted-foreground text-center text-xs" aria-live="polite">
            Actualizando datos…
          </p>
        )}
        {raffle.status === "paused" && <PauseBanner raffleId={raffle.id} />}
        <ActiveRaffleCard raffle={raffle} />
        <PrizesSection prizes={prizes} />
        <div id="comprar" className="scroll-mt-20">
          <PurchaseForm raffle={raffle} />
        </div>
      </div>
    </PublicLayout>
  )
}
