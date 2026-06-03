import type { TransitionRaffleInput } from "@raffle/shared/validators"
import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { adminRaffleHubLink } from "@/features/admin/raffles/admin-raffle-hub"
import { RaffleRowActions } from "@/features/admin/raffles/RaffleRowActions"
import { RaffleStatusBadge } from "@/features/admin/raffles/RaffleStatusBadge"
import type { RaffleRow } from "@/features/admin/raffles/types"
import { AdminDataGrid } from "@/features/admin/shared/AdminDataGrid"
import { formatCurrency, formatDate } from "@/lib/format"

type RafflesDataTableProps = {
  raffles: Array<RaffleRow>
  loading?: boolean
  pending?: boolean
  onLifecycle: (id: number, request: TransitionRaffleInput) => void
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
          <span className="font-mono text-[11px] text-muted-foreground">#{String(getValue())}</span>
        ),
      },
      {
        id: "name",
        header: "Rifa",
        cell: ({ row }) => (
          <div className="min-w-44">
            <Link
              {...adminRaffleHubLink(row.original.id)}
              className="max-w-52 truncate font-medium hover:underline"
            >
              {row.original.name}
            </Link>
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
        cell: ({ row }) => <span className="tabular-nums">{row.original.sold_percentage}%</span>,
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
          <span className="text-muted-foreground">{formatDate(String(getValue() ?? ""))}</span>
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
              onLifecycle={(request) => onLifecycle(row.original.id, request)}
            />
          </div>
        ),
      },
    ],
    [onLifecycle, pending],
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
      <p className="py-8 text-center text-sm text-muted-foreground">No hay rifas en este filtro.</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {raffles.map((raffle) => (
        <div key={raffle.id} className="rounded-xl border p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <Link {...adminRaffleHubLink(raffle.id)} className="font-medium hover:underline">
                {raffle.name}
              </Link>
              <p className="text-xs text-muted-foreground">ID {raffle.id}</p>
            </div>
            <RaffleStatusBadge status={raffle.status} />
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            {raffle.tickets_sold} / {raffle.total_tickets} vendidos ({raffle.sold_percentage}%)
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(raffle.price_bs)} · {formatCurrency(raffle.price_usd, "USD")} · Sorteo:{" "}
            {formatDate(raffle.draw_date)}
          </p>
          <div className="mt-3">
            <RaffleRowActions
              raffle={raffle}
              pending={pending}
              onLifecycle={(request) => onLifecycle(raffle.id, request)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
