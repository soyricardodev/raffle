import type { ColumnDef } from "@tanstack/react-table"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { PurchaseRowActions } from "@/features/admin/purchases/PurchaseRowActions"
import { PurchaseStatusBadge } from "@/features/admin/purchases/PurchaseStatusBadge"
import type { PurchaseRow } from "@/features/admin/purchases/types"
import { AdminDataGrid } from "@/features/admin/shared/AdminDataGrid"
import { formatCurrencyForMethod, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

type PurchasesDataTableProps = {
  purchases: Array<PurchaseRow>
  loading?: boolean
  pending?: boolean
  onView: (purchase: PurchaseRow) => void
  onStatusChange: (id: number, status: "approved" | "rejected") => void
}

export function PurchasesDataTable({
  purchases,
  loading = false,
  pending = false,
  onView,
  onStatusChange,
}: PurchasesDataTableProps) {
  const columns = useMemo<Array<ColumnDef<PurchaseRow>>>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] text-muted-foreground">#{String(getValue())}</span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Fecha",
        cell: ({ getValue }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDateTime(String(getValue()))}
          </span>
        ),
      },
      {
        id: "customer",
        header: "Cliente",
        cell: ({ row }) => (
          <div className="min-w-44">
            <p className="max-w-52 truncate font-medium">{row.original.customer_name}</p>
            <p className="text-[11px] text-muted-foreground">{row.original.customer_phone}</p>
          </div>
        ),
      },
      {
        accessorKey: "raffle_name",
        header: "Rifa",
        cell: ({ getValue }) => (
          <span className="block max-w-44 truncate text-muted-foreground">
            {String(getValue())}
          </span>
        ),
      },
      {
        accessorKey: "ticket_quantity",
        header: "Boletos",
        cell: ({ row }) => (
          <div>
            <p className="font-medium tabular-nums">{row.original.ticket_quantity}</p>
            <p
              className="max-w-28 truncate font-mono text-[10px] text-muted-foreground"
              title={row.original.ticket_numbers}
            >
              {row.original.ticket_numbers || "Sin boletos"}
            </p>
          </div>
        ),
      },
      {
        id: "total",
        header: "Total",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatCurrencyForMethod(row.original.total_amount, row.original.payment_method)}
          </span>
        ),
      },
      {
        accessorKey: "payment_method",
        header: "Pago",
        cell: ({ row }) => (
          <div>
            <p className="capitalize">{row.original.payment_method}</p>
            <p className="max-w-24 truncate font-mono text-[10px] text-muted-foreground">
              {row.original.payment_reference || "Sin ref."}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <PurchaseStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <PurchaseRowActions
              purchase={row.original}
              pending={pending}
              density="compact"
              onView={() => onView(row.original)}
              onStatusChange={(status) => onStatusChange(row.original.id, status)}
            />
          </div>
        ),
      },
    ],
    [onView, onStatusChange, pending],
  )

  const table = useReactTable({
    data: purchases,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <AdminDataGrid
      table={table}
      columnCount={columns.length}
      loading={loading}
      emptyMessage="No hay ventas para mostrar."
      getRowClassName={(row) => cn(row.status === "pending" && "bg-amber-500/5")}
      onRowClick={onView}
    />
  )
}

export function PurchasesMobileList({
  purchases,
  loading = false,
  pending = false,
  onView,
  onStatusChange,
}: PurchasesDataTableProps) {
  if (loading && purchases.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  if (purchases.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No hay ventas para mostrar.</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {purchases.map((purchase) => (
        <div
          key={purchase.id}
          className={cn(
            "rounded-xl border p-4",
            purchase.status === "pending" && "border-amber-500/40 bg-amber-500/5",
          )}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{purchase.customer_name}</p>
              <p className="text-xs text-muted-foreground">{purchase.customer_phone}</p>
            </div>
            <PurchaseStatusBadge status={purchase.status} />
          </div>
          <p className="text-sm text-muted-foreground">{purchase.raffle_name}</p>
          <p className="mt-1 text-sm font-semibold">
            {purchase.ticket_quantity} boletos ·{" "}
            {formatCurrencyForMethod(purchase.total_amount, purchase.payment_method)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(purchase.created_at)}
          </p>
          <div className="mt-3">
            <PurchaseRowActions
              purchase={purchase}
              pending={pending}
              onView={() => onView(purchase)}
              onStatusChange={(status) => onStatusChange(purchase.id, status)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
