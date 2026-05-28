import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getRouteApi, useNavigate } from "@tanstack/react-router"
import {
  ArrowClockwiseIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { PurchaseRow } from "@/features/admin/purchases/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminDateRangeFilter } from "@/features/admin/shared/AdminDateRangeFilter"
import { AdminDataGridPagination } from "@/features/admin/shared/AdminDataGrid"
import { PurchaseDetailDrawer } from "@/features/admin/purchases/PurchaseDetailDrawer"
import {
  PurchasesDataTable,
  PurchasesMobileList,
} from "@/features/admin/purchases/PurchasesDataTable"
import {
  ADMIN_PURCHASES_PAGE_SIZE,
  adminPurchasesDashboardQueryOptions,
  adminPurchasesQueryOptions,
  normalizeAdminPurchaseFilters,
} from "@/features/admin/purchases/admin-purchases-queries"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { adminFetch } from "@/lib/admin-fetch"
import { cn } from "@/lib/utils"

const routeApi = getRouteApi("/admin/compras")
const POLL_MS = 30_000

export function AdminPurchasesView() {
  const routeSearch = routeApi.useSearch()
  const { defaultRaffleId } = routeApi.useLoaderData()
  const navigate = useNavigate({ from: "/admin/compras" })
  const queryClient = useQueryClient()

  const purchaseFromUrl =
    routeSearch.purchase != null && routeSearch.purchase > 0
      ? routeSearch.purchase
      : null

  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(
    purchaseFromUrl
  )
  const filters = useMemo(
    () => normalizeAdminPurchaseFilters(routeSearch, defaultRaffleId),
    [routeSearch, defaultRaffleId]
  )
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "")

  const debouncedSearch = useDebouncedValue(searchDraft)

  useEffect(() => {
    setSearchDraft(filters.search ?? "")
  }, [filters.search])

  useEffect(() => {
    setSelectedPurchaseId(purchaseFromUrl)
  }, [purchaseFromUrl])

  useEffect(() => {
    const nextSearch = debouncedSearch.trim()
    if (nextSearch === (filters.search ?? "")) return

    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        q: nextSearch || undefined,
        page: 1,
      }),
    })
  }, [debouncedSearch, filters.search, navigate])

  const dashboardQuery = useQuery({
    ...adminPurchasesDashboardQueryOptions(),
    refetchOnMount: false,
  })

  const activeRaffles = dashboardQuery.data?.active_raffles ?? []

  const purchasesQuery = useQuery({
    ...adminPurchasesQueryOptions(filters),
    refetchInterval: POLL_MS,
    refetchOnMount: false,
  })

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number
      status: "approved" | "rejected"
    }) => {
      return adminFetch(`/api/admin/purchases/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      })
    },
    onSuccess: () => {
      toast.success("Estado actualizado")
      void queryClient.invalidateQueries({ queryKey: ["admin"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const purchases: Array<PurchaseRow> = purchasesQuery.data?.data ?? []
  const total = purchasesQuery.data?.total ?? 0
  const pageSize = filters.limit ?? ADMIN_PURCHASES_PAGE_SIZE
  const activeRaffleName = activeRaffles.find(
    (raffle) => String(raffle.id) === filters.raffleId
  )?.name
  const hasCustomFilters = Boolean(
    filters.search ||
    filters.start ||
    filters.end ||
    filters.status !== "all" ||
    routeSearch.raffle_id === "all" ||
    (filters.raffleId && filters.raffleId !== defaultRaffleId)
  )

  const pendingCount = useMemo(
    () => purchases.filter((p) => p.status === "pending").length,
    [purchases]
  )

  function openPurchase(row: PurchaseRow) {
    setSelectedPurchaseId(row.id)
    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        purchase: row.id,
      }),
    })
  }

  function closePurchaseDrawer() {
    setSelectedPurchaseId(null)
    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        purchase: undefined,
      }),
    })
  }

  function updateSearch(patch: Partial<typeof routeSearch>) {
    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        ...patch,
      }),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Compras"
        description={
          activeRaffleName
            ? `Últimas ${pageSize} compras de ${activeRaffleName}`
            : `Últimas ${pageSize} compras`
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={purchasesQuery.isFetching}
            onClick={() => void purchasesQuery.refetch()}
          >
            <ArrowClockwiseIcon
              data-icon="inline-start"
              className={cn(purchasesQuery.isFetching && "animate-spin")}
            />
            Actualizar
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="gap-3 border-b p-3 sm:p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Listado</CardTitle>
              <p className="text-xs text-muted-foreground tabular-nums">
                {total.toLocaleString("es-VE")} resultado
                {total === 1 ? "" : "s"}
                {pendingCount > 0
                  ? ` · ${pendingCount} pendiente${pendingCount === 1 ? "" : "s"} aquí`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <InputGroup className="lg:max-w-80">
              <InputGroupAddon>
                <MagnifyingGlassIcon />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Cliente, teléfono, cédula o referencia"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
              {searchDraft ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Limpiar búsqueda"
                    onClick={() => setSearchDraft("")}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Select
                value={filters.status}
                onValueChange={(status) => updateSearch({ status, page: 1 })}
              >
                <SelectTrigger size="sm" className="w-[136px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="approved">Aprobados</SelectItem>
                    <SelectItem value="rejected">Rechazados</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                value={filters.raffleId || "all"}
                onValueChange={(value) =>
                  updateSearch({
                    raffle_id: value,
                    page: 1,
                  })
                }
              >
                <SelectTrigger size="sm" className="w-[180px] max-w-full">
                  <SelectValue placeholder="Rifa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todas</SelectItem>
                    {activeRaffles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <AdminDateRangeFilter
                start={filters.start}
                end={filters.end}
                onChange={(range) =>
                  updateSearch({
                    start: range.start,
                    end: range.end,
                    page: 1,
                  })
                }
              />

              {hasCustomFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateSearch({
                      status: undefined,
                      raffle_id: defaultRaffleId ?? undefined,
                      q: undefined,
                      start: undefined,
                      end: undefined,
                      page: 1,
                    })
                  }
                >
                  Limpiar
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="hidden md:block">
            <PurchasesDataTable
              purchases={purchases}
              loading={purchasesQuery.isPending}
              pending={statusMutation.isPending}
              onView={openPurchase}
              onStatusChange={(id, status) =>
                statusMutation.mutate({ id, status })
              }
            />
          </div>
          <div className="p-3 md:hidden">
            <PurchasesMobileList
              purchases={purchases}
              loading={purchasesQuery.isPending}
              pending={statusMutation.isPending}
              onView={openPurchase}
              onStatusChange={(id, status) =>
                statusMutation.mutate({ id, status })
              }
            />
          </div>
          <AdminDataGridPagination
            page={filters.page}
            pageSize={pageSize}
            total={total}
            loading={purchasesQuery.isFetching}
            onPageChange={(page) => updateSearch({ page })}
          />
        </CardContent>
      </Card>

      <PurchaseDetailDrawer
        purchaseId={selectedPurchaseId}
        open={selectedPurchaseId != null}
        onOpenChange={(open) => !open && closePurchaseDrawer()}
        fallbackPurchase={
          selectedPurchaseId != null
            ? purchases.find((p) => p.id === selectedPurchaseId)
            : undefined
        }
      />
    </div>
  )
}
