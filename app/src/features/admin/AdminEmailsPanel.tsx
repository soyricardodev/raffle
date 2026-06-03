import {
  ArrowClockwiseIcon,
  DownloadSimpleIcon,
  EnvelopeSimpleIcon,
} from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  adminEmailHealthQueryOptions,
  adminEmailsQueryOptions,
  adminEmailStatsQueryOptions,
  normalizeAdminEmailFilters,
  type AdminEmailsSearchParams,
} from "@/features/admin/emails/admin-emails-queries"
import { AdminEmailsFilters } from "@/features/admin/emails/AdminEmailsFilters"
import { downloadEmailLogsCsv } from "@/features/admin/emails/export-emails-csv"
import { EmailLogDetailSheet } from "@/features/admin/emails/EmailLogDetailSheet"
import { EmailLogsDataTable, EmailLogsMobileList } from "@/features/admin/emails/EmailLogsDataTable"
import { EmailProviderBanner } from "@/features/admin/emails/EmailProviderBanner"
import { EmailStatsCards } from "@/features/admin/emails/EmailStatsCards"
import { EmailTestDialog } from "@/features/admin/emails/EmailTestDialog"
import type { EmailLogRow } from "@/features/admin/emails/types"
import { useResendEmailLog } from "@/features/admin/emails/use-resend-email-log"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { AdminDataGridPagination } from "@/features/admin/shared/AdminDataGrid"
import { adminNavTitle } from "@/features/admin/nav"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { cn } from "@/lib/utils"

const routeApi = getRouteApi("/admin/emails")
const POLL_MS = 30_000

export function AdminEmailsPanel() {
  const routeSearch = routeApi.useSearch()
  const navigate = useNavigate({ from: "/admin/emails" })

  const [testOpen, setTestOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const selectedLogId =
    routeSearch.log != null && routeSearch.log > 0 ? routeSearch.log : null

  const filters = useMemo(() => normalizeAdminEmailFilters(routeSearch), [routeSearch])
  const resend = useResendEmailLog()

  const updateSearch = useCallback(
    (patch: Partial<AdminEmailsSearchParams>) => {
      void navigate({
        replace: true,
        search: (previous) => ({
          ...previous,
          ...patch,
        }),
      })
    },
    [navigate],
  )

  const hasPendingFilter = filters.status === "pending"

  const logsQuery = useQuery({
    ...adminEmailsQueryOptions(filters),
    refetchOnMount: false,
    refetchInterval: (query) => {
      const rows = query.state.data?.data ?? []
      const hasPending = rows.some((r) => r.status === "pending") || hasPendingFilter
      return hasPending ? POLL_MS : false
    },
  })

  const statsQuery = useQuery({
    ...adminEmailStatsQueryOptions(filters),
    refetchOnMount: false,
  })

  const healthQuery = useQuery(adminEmailHealthQueryOptions())

  const logs: Array<EmailLogRow> = logsQuery.data?.data ?? []
  const total = logsQuery.data?.total ?? 0
  const pageSize = filters.limit

  function openLogDetail(log: EmailLogRow) {
    updateSearch({ log: log.id })
  }

  function closeLogDetail() {
    updateSearch({ log: undefined })
  }

  async function handleExport() {
    setExporting(true)
    try {
      const result = await downloadEmailLogsCsv(filters)
      if (result.truncated) {
        toast.warning(
          `Exportación limitada: se descargaron filas pero hay más de ${result.total?.toLocaleString("es-VE") ?? "?" } registros con estos filtros.`,
        )
      } else {
        toast.success("Exportación descargada")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al exportar")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title={adminNavTitle("/admin/emails")}
        description="Historial de envíos, métricas y pruebas"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setTestOpen(true)}>
              <EnvelopeSimpleIcon data-icon="inline-start" />
              Prueba
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              <DownloadSimpleIcon data-icon="inline-start" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={logsQuery.isFetching}
              onClick={() => void logsQuery.refetch()}
            >
              <ArrowClockwiseIcon
                data-icon="inline-start"
                className={cn(logsQuery.isFetching && "animate-spin")}
              />
              Actualizar
            </Button>
          </div>
        }
      />

      <EmailProviderBanner
        health={healthQuery.data}
        stats={statsQuery.data}
        onFilterFailed={() => updateSearch({ status: "failed", page: 1 })}
      />

      <EmailStatsCards stats={statsQuery.data} loading={statsQuery.isPending} />

      <Card className="overflow-hidden">
        <AdminEmailsFilters filters={filters} total={total} onPatchSearch={updateSearch} />

        <CardContent className="p-0">
          {logsQuery.isError ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <p className="text-sm text-muted-foreground">No se pudo cargar el historial.</p>
              <Button variant="outline" size="sm" onClick={() => void logsQuery.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <EmailLogsDataTable
                  logs={logs}
                  loading={logsQuery.isPending}
                  sortBy={filters.sortBy}
                  sortDir={filters.sortDir}
                  onSortChange={(sortBy, sortDir) =>
                    updateSearch({ sortBy, sortDir, page: 1 })
                  }
                  onRowClick={openLogDetail}
                  onResend={resend.requestResend}
                />
              </div>
              <div className="p-3 md:hidden">
                <EmailLogsMobileList
                  logs={logs}
                  loading={logsQuery.isPending}
                  onRowClick={openLogDetail}
                  onResend={resend.requestResend}
                />
              </div>
              <AdminDataGridPagination
                page={filters.page}
                pageSize={pageSize}
                total={total}
                loading={logsQuery.isFetching}
                onPageChange={(page) => updateSearch({ page })}
              />
            </>
          )}
        </CardContent>
      </Card>

      <EmailTestDialog open={testOpen} onOpenChange={setTestOpen} />

      <EmailLogDetailSheet
        logId={selectedLogId}
        open={selectedLogId != null}
        onOpenChange={(open) => {
          if (!open) closeLogDetail()
        }}
        onRequestResend={resend.requestResend}
        resendPending={resend.isPending}
      />

      <ConfirmAction
        open={resend.target != null}
        onOpenChange={(open) => !open && resend.cancelResend()}
        title="Reenviar correo"
        description={resend.description}
        confirmLabel="Reenviar"
        pending={resend.isPending}
        onConfirm={() => resend.confirmResend()}
      />
    </div>
  )
}
