import { Link, getRouteApi, useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowClockwiseIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { RaffleRow } from "@/features/admin/raffles/types"
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
  RafflesDataTable,
  RafflesMobileList,
} from "@/features/admin/raffles/RafflesDataTable"
import {
  ADMIN_RAFFLES_PAGE_SIZE,
  adminRafflesQueryOptions,
  normalizeAdminRaffleFilters,
} from "@/features/admin/raffles/admin-raffles-queries"
import { AdminDataGridPagination } from "@/features/admin/shared/AdminDataGrid"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { executeRaffleLifecycle } from "@/features/admin/raffles/use-admin-raffle-lifecycle"
import type { LifecycleConfirm } from "@/features/admin/raffles/raffle-lifecycle-ui"
import { cn } from "@/lib/utils"

const routeApi = getRouteApi("/admin/rifas/")

export function AdminRafflesTable() {
  const routeSearch = routeApi.useSearch()
  const navigate = useNavigate({ from: "/admin/rifas/" })
  const queryClient = useQueryClient()

  const filters = useMemo(
    () => normalizeAdminRaffleFilters(routeSearch),
    [routeSearch]
  )
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "")
  const debouncedSearch = useDebouncedValue(searchDraft)

  useEffect(() => {
    setSearchDraft(filters.search ?? "")
  }, [filters.search])

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

  const rafflesQuery = useQuery({
    ...adminRafflesQueryOptions(filters),
    refetchOnMount: false,
  })

  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      confirm,
    }: {
      id: number
      confirm: LifecycleConfirm
    }) => executeRaffleLifecycle(id, confirm),
    onSuccess: () => {
      toast.success("Rifa actualizada")
      void queryClient.invalidateQueries({ queryKey: ["admin", "raffles"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const raffles: Array<RaffleRow> = rafflesQuery.data?.data ?? []
  const total = rafflesQuery.data?.total ?? 0
  const pageSize = filters.limit ?? ADMIN_RAFFLES_PAGE_SIZE
  const hasCustomFilters = Boolean(
    filters.search || filters.status !== "active"
  )

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
        title="Mis rifas"
        description={`${total.toLocaleString("es-VE")} rifa${total === 1 ? "" : "s"} en el sistema`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={rafflesQuery.isFetching}
              onClick={() => void rafflesQuery.refetch()}
            >
              <ArrowClockwiseIcon
                data-icon="inline-start"
                className={cn(rafflesQuery.isFetching && "animate-spin")}
              />
              Actualizar
            </Button>
            <Button asChild size="sm">
              <Link to="/admin/crear">
                <PlusIcon data-icon="inline-start" />
                Nueva rifa
              </Link>
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="gap-3 border-b p-3 sm:p-4">
          <div>
            <CardTitle className="text-base">Listado</CardTitle>
            <p className="text-xs text-muted-foreground tabular-nums">
              Mostrando rifas{" "}
              {filters.status === "active"
                ? "activas"
                : `en estado «${filters.status}»`}
            </p>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <InputGroup className="lg:max-w-80">
              <InputGroupAddon>
                <MagnifyingGlassIcon />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Buscar rifa por nombre"
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
                <SelectTrigger size="sm" className="w-[148px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="paused">Pausadas</SelectItem>
                    <SelectItem value="finished">Finalizadas</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {hasCustomFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateSearch({
                      status: undefined,
                      q: undefined,
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
            <RafflesDataTable
              raffles={raffles}
              loading={rafflesQuery.isPending}
              pending={actionMutation.isPending}
              onLifecycle={(id, confirm) => actionMutation.mutate({ id, confirm })}
            />
          </div>
          <div className="p-3 md:hidden">
            <RafflesMobileList
              raffles={raffles}
              loading={rafflesQuery.isPending}
              pending={actionMutation.isPending}
              onLifecycle={(id, confirm) => actionMutation.mutate({ id, confirm })}
            />
          </div>
          <AdminDataGridPagination
            page={filters.page}
            pageSize={pageSize}
            total={total}
            loading={rafflesQuery.isFetching}
            onPageChange={(page) => updateSearch({ page })}
          />
        </CardContent>
      </Card>
    </div>
  )
}
