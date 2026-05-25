import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ActiveRaffleCard } from "@/features/home/ActiveRaffleCard"
import { PauseBanner } from "@/features/raffle/PauseBanner"
import { PrizesSection } from "@/features/raffle/PrizesSection"
import { PurchaseForm } from "@/features/raffle/PurchaseForm"
import { fetchRaffleById, raffleQueryKeys } from "@/features/raffle/raffle-queries"
import { PublicLayout } from "@/features/layout/PublicLayout"
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

function RaffleDetailPage() {
  const { id } = Route.useParams()
  const { raffle: loaderRaffle } = Route.useLoaderData()

  const { data: raffle = loaderRaffle, isError } = useQuery({
    queryKey: raffleQueryKeys.detail(id),
    queryFn: () => fetchRaffleById({ data: { id } }),
    initialData: (loaderRaffle ?? undefined) as EnrichedRaffle | undefined,
    staleTime: 30_000,
    refetchOnMount: false,
  })

  if (!raffle && !isError) {
    return (
      <PublicLayout>
        <div className="container mx-auto flex items-center justify-center py-20">
          <p className="text-muted-foreground animate-pulse">Cargando rifa…</p>
        </div>
      </PublicLayout>
    )
  }

  if (isError || !raffle) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-20 text-center">
          <h1 className="text-2xl font-bold">Rifa no encontrada</h1>
        </div>
      </PublicLayout>
    )
  }

  const prizes = (raffle.prizes ?? []) as Array<{
    name: string
    description?: string | null
    position?: number | string
  }>

  return (
    <PublicLayout>
      <div className="container mx-auto space-y-6 px-4 py-8">
        {raffle.status === "paused" && <PauseBanner raffleId={raffle.id} />}
        <ActiveRaffleCard raffle={raffle} />
        <PrizesSection prizes={prizes} />
        <PurchaseForm raffle={raffle} />
      </div>
    </PublicLayout>
  )
}
