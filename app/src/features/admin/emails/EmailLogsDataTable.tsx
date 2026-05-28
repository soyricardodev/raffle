import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { EmailLogRow } from "@/features/admin/emails/types"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminDataGrid } from "@/features/admin/shared/AdminDataGrid"
import { EmailStatusBadge } from "@/features/admin/emails/EmailStatusBadge"
import { formatDateTime } from "@/lib/format"

type EmailLogsDataTableProps = {
  logs: Array<EmailLogRow>
  loading?: boolean
}

export function EmailLogsDataTable({
  logs,
  loading = false,
}: EmailLogsDataTableProps) {
  const columns = useMemo<Array<ColumnDef<EmailLogRow>>>(
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
        accessorKey: "subject",
        header: "Asunto",
        cell: ({ row }) => (
          <div className="max-w-56 min-w-44">
            <p className="truncate font-medium">{row.original.subject}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {row.original.recipient_email}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "email_type",
        header: "Tipo",
        cell: ({ getValue }) => (
          <span className="capitalize">
            {String(getValue()).replace(/_/g, " ")}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <EmailStatusBadge status={row.original.status} />,
      },
      {
        id: "date",
        header: "Fecha",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDateTime(
              String(row.original.sent_at ?? row.original.created_at)
            )}
          </span>
        ),
      },
      {
        id: "customer",
        header: "Cliente",
        cell: ({ row }) => (
          <span className="max-w-32 truncate">
            {row.original.customer_name ?? "—"}
          </span>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <AdminDataGrid
      table={table}
      columnCount={columns.length}
      loading={loading}
      emptyMessage="Sin registros aún."
    />
  )
}

export function EmailLogsMobileList({
  logs,
  loading = false,
}: EmailLogsDataTableProps) {
  if (loading && logs.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sin registros aún.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {logs.map((log) => (
        <div key={log.id} className="rounded-xl border p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 leading-snug font-medium">
              {log.subject}
            </p>
            <EmailStatusBadge status={log.status} />
          </div>
          <p className="text-xs text-muted-foreground">{log.recipient_email}</p>
          <p className="mt-1 text-xs text-muted-foreground capitalize">
            {log.email_type.replace(/_/g, " ")} ·{" "}
            {formatDateTime(String(log.sent_at ?? log.created_at))}
          </p>
          {log.customer_name ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {log.customer_name}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
