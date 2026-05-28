import { flexRender, type Table as TanStackTable } from "@tanstack/react-table"
import type { ReactNode } from "react"
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type AdminDataGridProps<TData> = {
  table: TanStackTable<TData>
  columnCount: number
  loading?: boolean
  emptyMessage: string
  getRowClassName?: (row: TData) => string | undefined
  onRowClick?: (row: TData) => void
}

type AdminDataGridPaginationProps = {
  page: number
  pageSize: number
  total: number
  loading?: boolean
  onPageChange: (page: number) => void
  summary?: ReactNode
}

export function AdminDataGrid<TData>({
  table,
  columnCount,
  loading = false,
  emptyMessage,
  getRowClassName,
  onRowClick,
}: AdminDataGridProps<TData>) {
  const rows = table.getRowModel().rows

  return (
    <div className="overflow-hidden rounded-3xl border bg-card">
      <Table className="text-xs">
        <TableHeader className="bg-muted/40">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-8 px-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading && rows.length === 0 ? (
            Array.from({ length: 8 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell colSpan={columnCount} className="px-2 py-1.5">
                  <Skeleton className="h-7 rounded-xl" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  "h-9",
                  onRowClick && "cursor-pointer",
                  getRowClassName?.(row.original)
                )}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-2 py-1.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function AdminDataGridPagination({
  page,
  pageSize,
  total,
  loading = false,
  onPageChange,
  summary,
}: AdminDataGridPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="text-muted-foreground tabular-nums">
        {summary ?? (
          <>
            {start.toLocaleString("es-VE")}-{end.toLocaleString("es-VE")} de{" "}
            {total.toLocaleString("es-VE")}
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          <CaretLeftIcon data-icon="inline-start" />
          Anterior
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          Página {page} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
          <CaretRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
