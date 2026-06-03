import { ArrowSquareOut } from "@phosphor-icons/react"
import { PLATFORM_TOTAL_TICKETS } from "@raffle/shared/validators"
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminRaffleEditTab } from "@/features/admin/raffles/AdminRaffleEditTab"
import { AdminRaffleMissing } from "@/features/admin/raffles/AdminRaffleMissing"
import { AdminRaffleResumenTab } from "@/features/admin/raffles/AdminRaffleResumenTab"
import { useAdminRaffleDetailQuery } from "@/features/admin/raffles/admin-raffle-detail-queries"
import {
  type AdminRaffleHubTab,
  adminRaffleHubTabSearch,
  hubTabFromSearch,
} from "@/features/admin/raffles/admin-raffle-hub"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"

const routeApi = getRouteApi("/admin/rifas/$id")

export function AdminRaffleDetail({ raffleId }: { raffleId: string }) {
  const { tab } = routeApi.useSearch()
  const navigate = useNavigate({ from: "/admin/rifas/$id" })
  const raffleQuery = useAdminRaffleDetailQuery(raffleId)
  const activeTab = hubTabFromSearch(tab)

  function setTab(value: AdminRaffleHubTab) {
    void navigate({
      replace: true,
      search: adminRaffleHubTabSearch(value),
    })
  }

  function goToResumen() {
    setTab("resumen")
  }

  if (raffleQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="aspect-video w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (raffleQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="text-lg font-medium">No se pudo cargar la rifa</p>
        <p className="text-muted-foreground max-w-sm text-sm">{raffleQuery.error.message}</p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => void raffleQuery.refetch()}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  const raffle = raffleQuery.data
  if (raffle == null) {
    return <AdminRaffleMissing raffleId={raffleId} />
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={raffle.name}
        description={`Rifa #${raffle.id} · ${PLATFORM_TOTAL_TICKETS.toLocaleString("es-VE")} boletos (0000-9999)`}
        actions={
          <Button asChild variant="outline" className="min-h-11">
            <Link to="/rifa/$id" params={{ id: raffleId }} target="_blank">
              <ArrowSquareOut data-icon="inline-start" />
              Vista pública
            </Link>
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === "resumen" || value === "editar") setTab(value)
        }}
        className="gap-4"
      >
        <TabsList className="flex h-auto w-full max-w-md flex-wrap gap-1 p-1">
          <TabsTrigger value="resumen" className="min-h-9 flex-1 text-xs sm:text-sm">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="editar" className="min-h-9 flex-1 text-xs sm:text-sm">
            Editar configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-0">
          <AdminRaffleResumenTab raffleId={raffleId} raffle={raffle} />
        </TabsContent>

        <TabsContent value="editar" className="mt-0">
          <AdminRaffleEditTab
            raffleId={raffleId}
            detail={raffle}
            formKey={`${raffleId}-${raffleQuery.dataUpdatedAt}`}
            onDone={goToResumen}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
