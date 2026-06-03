import {
  ArrowClockwiseIcon,
  EnvelopeSimpleIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ADMIN_EMAILS_PAGE_SIZE,
  adminEmailsQueryOptions,
  normalizeAdminEmailFilters,
} from "@/features/admin/emails/admin-emails-queries"
import { EmailLogsDataTable, EmailLogsMobileList } from "@/features/admin/emails/EmailLogsDataTable"
import type { EmailLogRow } from "@/features/admin/emails/types"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { AdminDataGridPagination } from "@/features/admin/shared/AdminDataGrid"
import { AdminDateRangeFilter } from "@/features/admin/shared/AdminDateRangeFilter"
import { adminNavTitle } from "@/features/admin/nav"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { adminFetch } from "@/lib/admin-fetch"
import { cn } from "@/lib/utils"

const routeApi = getRouteApi("/admin/emails")

export function AdminEmailsPanel() {
  const routeSearch = routeApi.useSearch()
  const navigate = useNavigate({ from: "/admin/emails" })
  const queryClient = useQueryClient()

  const [testEmail, setTestEmail] = useState("")
  const [confirmSend, setConfirmSend] = useState(false)

  const filters = useMemo(() => normalizeAdminEmailFilters(routeSearch), [routeSearch])
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

  const logsQuery = useQuery({
    ...adminEmailsQueryOptions(filters),
    refetchOnMount: false,
  })

  const testMutation = useMutation({
    mutationFn: () =>
      adminFetch("/api/admin/emails", {
        method: "POST",
        body: JSON.stringify({ to: testEmail.trim() }),
      }),
    onSuccess: () => {
      toast.success("Email de prueba enviado")
      setConfirmSend(false)
      void queryClient.invalidateQueries({ queryKey: ["admin", "emails"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const logs: Array<EmailLogRow> = logsQuery.data?.data ?? []
  const total = logsQuery.data?.total ?? 0
  const pageSize = filters.limit ?? ADMIN_EMAILS_PAGE_SIZE
  const hasCustomFilters = Boolean(
    filters.search || filters.start || filters.end || filters.status !== "all",
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
        title={adminNavTitle("/admin/emails")}
        description="Historial de envíos y pruebas"
        actions={
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
        }
      />

      <Card>
        <CardHeader className="border-b p-3 sm:p-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <EnvelopeSimpleIcon />
            Email de prueba
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:p-4">
          <div className="min-w-0 flex-1 sm:min-w-[240px]">
            <Label htmlFor="test-email">Destinatario</Label>
            <Input
              id="test-email"
              type="email"
              className="mt-1.5"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <Button
            className="w-full sm:w-auto"
            disabled={!testEmail.trim() || testMutation.isPending}
            onClick={() => setConfirmSend(true)}
          >
            Enviar prueba
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="gap-3 border-b p-3 sm:p-4">
          <div>
            <CardTitle className="text-base">Historial</CardTitle>
            <p className="text-xs text-muted-foreground tabular-nums">
              {total.toLocaleString("es-VE")} registro{total === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <InputGroup className="lg:max-w-80">
              <InputGroupAddon>
                <MagnifyingGlassIcon />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Asunto, destinatario o cliente"
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
                    <SelectItem value="sent">Enviados</SelectItem>
                    <SelectItem value="failed">Fallidos</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
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
            <EmailLogsDataTable logs={logs} loading={logsQuery.isPending} />
          </div>
          <div className="p-3 md:hidden">
            <EmailLogsMobileList logs={logs} loading={logsQuery.isPending} />
          </div>
          <AdminDataGridPagination
            page={filters.page}
            pageSize={pageSize}
            total={total}
            loading={logsQuery.isFetching}
            onPageChange={(page) => updateSearch({ page })}
          />
        </CardContent>
      </Card>

      <ConfirmAction
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title="Enviar email de prueba"
        description={`¿Enviar un correo de prueba a ${testEmail.trim()}?`}
        confirmLabel="Enviar"
        pending={testMutation.isPending}
        onConfirm={() => testMutation.mutate()}
      />
    </div>
  )
}
