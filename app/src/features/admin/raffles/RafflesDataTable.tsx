import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { RaffleRow } from "@/features/admin/raffles/types"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminDataGrid } from "@/features/admin/shared/AdminDataGrid"
import { RaffleRowActions } from "@/features/admin/raffles/RaffleRowActions"
import { RaffleStatusBadge } from "@/features/admin/raffles/RaffleStatusBadge"
import type { LifecycleConfirm } from "@/features/admin/raffles/raffle-lifecycle-ui"
import { formatCurrency, formatDate } from "@/lib/format"

type RafflesDataTableProps = {
  raffles: Array<RaffleRow>
  loading?: boolean
  pending?: boolean
  onLifecycle: (id: number, confirm: LifecycleConfirm) => void
}

export function RafflesDataTable({
  raffles,
  loading = false,
  pending = false,
  onLifecycle,
}: RafflesDataTableProps) {
  const columns = useMemo<Array<ColumnDef<RaffleRow>>>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] text-muted-foreground">
            #{String(getValue())}
          </span>
        ),
      },
      {
        id: "name",
        header: "Rifa",
        cell: ({ row }) => (
          <div className="min-w-44">
            <p className="max-w-52 truncate font-medium">{row.original.name}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {row.original.tickets_sold}/{row.original.total_tickets} vendidos
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <RaffleStatusBadge status={row.original.status} />,
      },
      {
        id: "sales",
        header: "Progreso",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.sold_percentage}%</span>
        ),
      },
      {
        id: "prices",
        header: "Precios",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatCurrency(row.original.price_bs)} ·{" "}
            {formatCurrency(row.original.price_usd, "USD")}
          </span>
        ),
      },
      {
        accessorKey: "draw_date",
        header: "Sorteo",
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">
            {formatDate(String(getValue() ?? ""))}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <RaffleRowActions
              raffle={row.original}
              pending={pending}
              density="compact"
              onLifecycle={(confirm) => onLifecycle(row.original.id, confirm)}
            />
          </div>
        ),
      },
    ],
    [onLifecycle, pending]
  )

  const table = useReactTable({
    data: raffles,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <AdminDataGrid
      table={table}
      columnCount={columns.length}
      loading={loading}
      emptyMessage="No hay rifas en este filtro."
    />
  )
}

export function RafflesMobileList({
  raffles,
  loading = false,
  pending = false,
  onLifecycle,
}: RafflesDataTableProps) {
  if (loading && raffles.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  if (raffles.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay rifas en este filtro.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {raffles.map((raffle) => (
        <div key={raffle.id} className="rounded-xl border p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{raffle.name}</p>
              <p className="text-xs text-muted-foreground">ID {raffle.id}</p>
            </div>
            <RaffleStatusBadge status={raffle.status} />
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            {raffle.tickets_sold} / {raffle.total_tickets} vendidos (
            {raffle.sold_percentage}%)
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(raffle.price_bs)} ·{" "}
            {formatCurrency(raffle.price_usd, "USD")} · Sorteo:{" "}
            {formatDate(raffle.draw_date)}
          </p>
          <div className="mt-3">
            <RaffleRowActions
              raffle={raffle}
              pending={pending}
              onLifecycle={(confirm) => onLifecycle(raffle.id, confirm)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
