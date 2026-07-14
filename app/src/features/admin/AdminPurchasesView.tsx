import { ArrowClockwiseIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react"
import {
  PAYMENT_METHOD_DEFINITIONS,
  paymentMethodTypeLabel,
  type PaymentMethod,
} from "@raffle/shared/payment-methods"
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useState } from "react"
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
import {
  adminPurchasesDashboardQueryOptions,
  adminPurchasesInfiniteQueryOptions,
  adminPurchasesRefetchInterval,
  flattenAdminPurchasesPages,
  getDefaultAdminPurchasesRaffleId,
  normalizeAdminPurchaseFilters,
} from "@/features/admin/purchases/admin-purchases-queries"
import { useSanitizeAdminRaffleUrlParam } from "@/features/admin/shared/use-admin-raffle-url-scope"
import { PurchaseDetailDrawer } from "@/features/admin/purchases/PurchaseDetailDrawer"
import { PurchasesInfiniteLoadFooter } from "@/features/admin/purchases/PurchasesInfiniteLoadFooter"
import {
  PurchasesDataTable,
  PurchasesMobileList,
} from "@/features/admin/purchases/PurchasesDataTable"
import { useInfiniteScrollSentinel } from "@/features/admin/purchases/use-infinite-scroll-sentinel"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { adminDateRangePresets } from "@/features/admin/shared/admin-date-range-presets"
import { AdminRaffleScopeSelect } from "@/features/admin/shared/AdminRaffleScopeSelect"
import { raffleStatusLabel } from "@/features/admin/raffle-labels"
import { useAdminPurchaseStatusUpdate } from "@/features/admin/purchases/use-admin-purchase-status-update"
import { adminNavTitle } from "@/features/admin/nav"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { useDebouncedSearchParam } from "@/hooks/useDebouncedSearchParam"
import { cn } from "@/lib/utils"

const routeApi = getRouteApi("/admin/compras")

const PAYMENT_METHOD_FILTER_OPTIONS = (
  Object.keys(PAYMENT_METHOD_DEFINITIONS) as Array<PaymentMethod>
).map((code) => ({
  value: code,
  label: paymentMethodTypeLabel(code),
}))

export function AdminPurchasesView() {
  const routeSearch = routeApi.useSearch()
  const navigate = useNavigate({ from: "/admin/compras" })
  const purchaseFromUrl =
    routeSearch.purchase != null && routeSearch.purchase > 0 ? routeSearch.purchase : null

  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(purchaseFromUrl)
  const dashboardQuery = useQuery({
    ...adminPurchasesDashboardQueryOptions(),
    refetchOnMount: false,
  })
  const filterRaffles = dashboardQuery.data?.filter_raffles ?? []
  const defaultRaffleId = getDefaultAdminPurchasesRaffleId(dashboardQuery.data)
  const filters = useMemo(
    () => normalizeAdminPurchaseFilters(routeSearch, { defaultRaffleId }),
    [defaultRaffleId, routeSearch],
  )

  const commitSearch = useCallback(
    (nextSearch: string) => {
      void navigate({
        replace: true,
        search: (previous) => ({
          ...previous,
          q: nextSearch || undefined,
        }),
      })
    },
    [navigate],
  )

  const search = useDebouncedSearchParam(filters.search, commitSearch, {
    delayMs: 400,
  })

  useEffect(() => {
    setSelectedPurchaseId(purchaseFromUrl)
  }, [purchaseFromUrl])

  useSanitizeAdminRaffleUrlParam({
    raffleId: filters.raffleId ?? null,
    filterRaffles,
    from: "/admin/compras",
  })

  const purchasesQuery = useInfiniteQuery({
    ...adminPurchasesInfiniteQueryOptions(filters),
    placeholderData: keepPreviousData,
    refetchInterval: adminPurchasesRefetchInterval,
    refetchOnMount: false,
  })

  const isSearchBusy =
    search.isDebouncing ||
    (search.isDirty && purchasesQuery.isFetching && !purchasesQuery.isFetchingNextPage)

  const sentinelRef = useInfiniteScrollSentinel({
    hasNextPage: purchasesQuery.hasNextPage,
    isFetching: purchasesQuery.isFetching,
    isFetchingNextPage: purchasesQuery.isFetchingNextPage,
    fetchNextPage: purchasesQuery.fetchNextPage,
  })

  const statusMutation = useAdminPurchaseStatusUpdate({
    onSuccess: () => toast.success("Estado actualizado"),
  })

  const purchases: Array<PurchaseRow> = flattenAdminPurchasesPages(purchasesQuery.data?.pages)
  const total = purchasesQuery.data?.pages[0]?.total ?? 0
  const pageSize = filters.limit
  const selectedRaffle = filterRaffles.find((r) => String(r.id) === filters.raffleId)
  const hasCustomFilters = Boolean(
    filters.search ||
      filters.start ||
      filters.end ||
      filters.status !== "all" ||
      filters.paymentMethod !== "all" ||
      filters.raffleId ||
      filters.sort !== "newest",
  )

  const pendingCount = useMemo(
    () => purchases.filter((p) => p.status === "pending").length,
    [purchases],
  )

  const isInitialLoading = purchasesQuery.isPending && purchases.length === 0
  const isLoadingMore = purchasesQuery.isFetchingNextPage

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
        title={adminNavTitle("/admin/compras")}
        description={
          selectedRaffle
            ? `Compras de ${selectedRaffle.name} (${raffleStatusLabel(selectedRaffle.status)}) · ${pageSize} por carga`
            : `Compras de todas las rifas · ${pageSize} por carga`
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
                  ? ` · ${pendingCount} pendiente${pendingCount === 1 ? "" : "s"} cargada${pendingCount === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <InputGroup className="lg:max-w-80">
              <InputGroupAddon>
                {isSearchBusy ? (
                  <ArrowClockwiseIcon className="size-4 animate-spin" aria-hidden />
                ) : (
                  <MagnifyingGlassIcon aria-hidden />
                )}
              </InputGroupAddon>
              <InputGroupInput
                {...search.bind}
                placeholder="Cliente, teléfono, cédula, referencia o boleto"
                aria-busy={isSearchBusy}
                autoComplete="off"
                spellCheck={false}
              />
              {search.inputValue && !isSearchBusy ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Limpiar búsqueda"
                    onClick={search.clear}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Select
                value={filters.status}
                onValueChange={(status) => updateSearch({ status })}
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
                value={filters.sort}
                onValueChange={(sort) => updateSearch({ sort })}
              >
                <SelectTrigger size="sm" className="w-[168px] max-w-full">
                  <SelectValue placeholder="Orden por fecha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="newest">Más recientes primero</SelectItem>
                    <SelectItem value="oldest">Más antiguas primero</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                value={filters.paymentMethod}
                onValueChange={(payment_method) => updateSearch({ payment_method })}
              >
                <SelectTrigger size="sm" className="w-[148px] max-w-full">
                  <SelectValue placeholder="Método de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos los métodos</SelectItem>
                    {PAYMENT_METHOD_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <AdminRaffleScopeSelect
                raffles={filterRaffles}
                value={filters.raffleId ?? null}
                onValueChange={(value) =>
                  updateSearch({
                    raffle_id: value === "all" ? "all" : value,
                  })
                }
                disabled={dashboardQuery.isLoading || filterRaffles.length === 0}
                size="sm"
                triggerClassName="w-[200px] max-w-full"
              />

              <DateRangePicker
                start={filters.start}
                end={filters.end}
                presets={adminDateRangePresets}
                align="end"
                size="sm"
                className="min-w-0"
                onChange={(range) =>
                  updateSearch({
                    start: range.start,
                    end: range.end,
                  })
                }
              />

              {hasCustomFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    search.clear()
                    updateSearch({
                      status: undefined,
                      payment_method: undefined,
                      raffle_id: "all",
                      q: undefined,
                      start: undefined,
                      end: undefined,
                      sort: undefined,
                    })
                  }}
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
              loading={isInitialLoading}
              loadingMore={isLoadingMore}
              pending={statusMutation.isPending}
              onView={openPurchase}
              onStatusChange={(id, status, notes) =>
                statusMutation.mutate({ purchaseId: id, status, notes })
              }
            />
          </div>
          <div className="p-3 md:hidden">
            <PurchasesMobileList
              purchases={purchases}
              loading={isInitialLoading}
              loadingMore={isLoadingMore}
              pending={statusMutation.isPending}
              onView={openPurchase}
              onStatusChange={(id, status, notes) =>
                statusMutation.mutate({ purchaseId: id, status, notes })
              }
            />
          </div>
          <PurchasesInfiniteLoadFooter
            loadedCount={purchases.length}
            total={total}
            hasNextPage={purchasesQuery.hasNextPage}
            isFetchingNextPage={purchasesQuery.isFetchingNextPage}
            isFetching={purchasesQuery.isFetching}
            onLoadMore={() => void purchasesQuery.fetchNextPage()}
            sentinelRef={sentinelRef}
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
