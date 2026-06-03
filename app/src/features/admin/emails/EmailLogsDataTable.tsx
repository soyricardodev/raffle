import {
  ArrowSquareOutIcon,
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CaretUpIcon,
} from "@phosphor-icons/react"
import type { ColumnDef, SortingState } from "@tanstack/react-table"
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { Link } from "@tanstack/react-router"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { canResendEmailLog } from "@/features/admin/emails/email-log-actions"
import { emailTypeIcon, emailTypeLabel } from "@/features/admin/emails/email-labels"
import { EmailStatusBadge } from "@/features/admin/emails/EmailStatusBadge"
import type { EmailLogRow } from "@/features/admin/emails/types"
import { AdminDataGrid } from "@/features/admin/shared/AdminDataGrid"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

type EmailLogsDataTableProps = {
  logs: Array<EmailLogRow>
  loading?: boolean
  sortBy?: "created_at" | "sent_at" | "status"
  sortDir?: "asc" | "desc"
  onSortChange?: (sortBy: "created_at" | "sent_at" | "status", sortDir: "asc" | "desc") => void
  onRowClick?: (log: EmailLogRow) => void
  onResend?: (log: EmailLogRow) => void
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: "asc" | "desc"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-0.5 hover:text-foreground"
      onClick={onClick}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <CaretUpIcon className="size-3" />
        ) : (
          <CaretDownIcon className="size-3" />
        )
      ) : null}
    </button>
  )
}

export function EmailLogsDataTable({
  logs,
  loading = false,
  sortBy = "created_at",
  sortDir = "desc",
  onSortChange,
  onRowClick,
  onResend,
}: EmailLogsDataTableProps) {
  const sorting: SortingState = useMemo(
    () => [{ id: sortBy === "sent_at" ? "date" : sortBy, desc: sortDir === "desc" }],
    [sortBy, sortDir],
  )

  function toggleSort(column: "created_at" | "sent_at" | "status") {
    if (!onSortChange) return
    if (sortBy === column) {
      onSortChange(column, sortDir === "desc" ? "asc" : "desc")
    } else {
      onSortChange(column, "desc")
    }
  }

  const columns = useMemo<Array<ColumnDef<EmailLogRow>>>(
    () => [
      {
        accessorKey: "email_type",
        header: "Tipo",
        cell: ({ row }) => {
          const Icon = emailTypeIcon(row.original.email_type)
          return (
            <div className="flex min-w-36 items-start gap-2">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-medium">{emailTypeLabel(row.original.email_type)}</p>
                {row.original.purchase_id ? (
                  <Link
                    to="/admin/compras"
                    search={{ purchase: row.original.purchase_id }}
                    className="text-primary text-[11px] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Compra #{row.original.purchase_id}
                  </Link>
                ) : null}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "subject",
        header: "Asunto",
        cell: ({ row }) => (
          <div className="max-w-56 min-w-44">
            <p className="truncate font-medium">{row.original.subject}</p>
            <a
              href={`mailto:${row.original.recipient_email}`}
              className="text-primary truncate text-[11px] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.original.recipient_email}
            </a>
            {row.original.error_message ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-red-600 dark:text-red-400">
                    {row.original.error_message}
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{row.original.error_message}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <SortableHeader
            label="Estado"
            active={sortBy === "status"}
            dir={sortDir}
            onClick={() => toggleSort("status")}
          />
        ),
        cell: ({ row }) => <EmailStatusBadge status={row.original.status} />,
      },
      {
        id: "date",
        header: () => (
          <SortableHeader
            label="Fecha"
            active={sortBy === "created_at" || sortBy === "sent_at"}
            dir={sortDir}
            onClick={() => toggleSort(sortBy === "sent_at" ? "sent_at" : "created_at")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDateTime(String(row.original.sent_at ?? row.original.created_at))}
          </span>
        ),
      },
      {
        id: "customer",
        header: "Cliente",
        cell: ({ row }) => (
          <div className="max-w-32">
            <span className="block truncate">{row.original.customer_name ?? "—"}</span>
            {row.original.customer_phone ? (
              <span className="text-muted-foreground block truncate text-[11px]">
                {row.original.customer_phone}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const log = row.original
          const showResend = onResend && canResendEmailLog(log)
          return (
            <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Ver detalle"
                onClick={() => onRowClick?.(log)}
              >
                <ArrowSquareOutIcon />
              </Button>
              {showResend ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Reenviar"
                  onClick={() => onResend(log)}
                >
                  <ArrowsClockwiseIcon />
                </Button>
              ) : null}
            </div>
          )
        },
      },
    ],
    [onResend, onRowClick, sortBy, sortDir, onSortChange],
  )

  const table = useReactTable({
    data: logs,
    columns,
    state: { sorting },
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <TooltipProvider>
      <AdminDataGrid
        table={table}
        columnCount={columns.length}
        loading={loading}
        emptyMessage="Sin registros con estos filtros."
        onRowClick={onRowClick}
        getRowClassName={() => (onRowClick ? "cursor-pointer" : undefined)}
      />
    </TooltipProvider>
  )
}

export function EmailLogsMobileList({
  logs,
  loading = false,
  onRowClick,
  onResend,
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
        Sin registros con estos filtros.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className={cn(
            "rounded-xl border p-4",
            onRowClick && "hover:bg-muted/40",
          )}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <button
              type="button"
              className="min-w-0 flex-1 text-left leading-snug font-medium"
              onClick={() => onRowClick?.(log)}
            >
              {log.subject}
            </button>
            <div className="flex shrink-0 items-center gap-1">
              <EmailStatusBadge status={log.status} />
              {onResend && canResendEmailLog(log) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Reenviar"
                  onClick={() => onResend(log)}
                >
                  <ArrowsClockwiseIcon />
                </Button>
              ) : null}
            </div>
          </div>
          <button type="button" className="w-full text-left" onClick={() => onRowClick?.(log)}>
            <p className="text-xs text-muted-foreground">{log.recipient_email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {emailTypeLabel(log.email_type)}
              {log.purchase_id ? ` · Compra #${log.purchase_id}` : ""} ·{" "}
              {formatDateTime(String(log.sent_at ?? log.created_at))}
            </p>
            {log.error_message ? (
              <p className="mt-1 line-clamp-2 text-xs text-red-600 dark:text-red-400">
                {log.error_message}
              </p>
            ) : null}
          </button>
        </div>
      ))}
    </div>
  )
}
