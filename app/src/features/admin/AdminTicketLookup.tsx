import { ArrowSquareOut, MagnifyingGlass, Ticket } from "@phosphor-icons/react"
import { ticketNumberToString } from "@raffle/shared/db/ticket-number"
import { useQuery } from "@tanstack/react-query"
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { PurchaseStatusBadge } from "@/features/admin/purchases/PurchaseStatusBadge"
import { RaffleStatusBadge } from "@/features/admin/raffles/RaffleStatusBadge"
import { adminNavTitle } from "@/features/admin/nav"
import { raffleStatusLabel } from "@/features/admin/raffle-labels"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { AdminRaffleScopeSelect } from "@/features/admin/shared/AdminRaffleScopeSelect"
import { adminRaffleScopeSearchParam } from "@/features/admin/shared/admin-raffle-scope"
import { useSanitizeAdminRaffleUrlParam } from "@/features/admin/shared/use-admin-raffle-url-scope"
import { adminPurchasesDashboardQueryOptions } from "@/features/admin/purchases/admin-purchases-queries"
import {
  ADMIN_TICKET_LOOKUP_PATTERN,
  type AdminTicketLookupResult,
  adminTicketLookupQueryOptions,
  getDefaultAdminTicketLookupRaffleId,
  normalizeAdminTicketLookupFilters,
} from "@/features/admin/tickets/admin-ticket-lookup-queries"
import {
  featuredTicketBadgeClassName,
  featuredTicketSectionClassName,
} from "@/features/tickets/ticket-badge-styles"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatDateTime, getStatusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const routeApi = getRouteApi("/admin/boletos")

function normalizeTicketInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 4)
}

export function AdminTicketLookup() {
  const routeSearch = routeApi.useSearch()
  const navigate = useNavigate({ from: "/admin/boletos" })

  const dashboardQuery = useQuery({
    ...adminPurchasesDashboardQueryOptions(),
    refetchOnMount: false,
  })
  const filterRaffles = dashboardQuery.data?.filter_raffles ?? []
  const defaultRaffleId = getDefaultAdminTicketLookupRaffleId(dashboardQuery.data)
  const filters = useMemo(
    () => normalizeAdminTicketLookupFilters(routeSearch, { defaultRaffleId }),
    [defaultRaffleId, routeSearch],
  )

  const [draft, setDraft] = useState(routeSearch.ticket ?? "")
  const ticket = routeSearch.ticket?.trim() ?? ""

  useEffect(() => {
    setDraft(routeSearch.ticket ?? "")
  }, [routeSearch.ticket])

  useSanitizeAdminRaffleUrlParam({
    raffleId: filters.raffleId,
    filterRaffles,
    from: "/admin/boletos",
  })

  const lookupQuery = useQuery(adminTicketLookupQueryOptions(ticket, filters.raffleId))

  const selectedRaffle = filterRaffles.find((r) => String(r.id) === filters.raffleId)
  const scopeLabel = selectedRaffle
    ? `${selectedRaffle.name} (${raffleStatusLabel(selectedRaffle.status)})`
    : "todas las rifas"

  function handleSearch() {
    const digits = normalizeTicketInput(draft)
    if (!digits) return
    const normalized = ticketNumberToString(Number.parseInt(digits, 10))
    void navigate({
      search: (previous) => ({
        ...previous,
        ticket: normalized,
        raffle_id: adminRaffleScopeSearchParam(
          routeSearch.raffle_id,
          filters.raffleId,
          defaultRaffleId,
        ),
      }),
      replace: true,
    })
  }

  function updateRaffleScope(value: string) {
    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        raffle_id: value === "all" ? "all" : value,
      }),
    })
  }

  const isBusy = lookupQuery.isFetching
  const matches = lookupQuery.data ?? []
  const showEmpty =
    ADMIN_TICKET_LOOKUP_PATTERN.test(ticket) &&
    !isBusy &&
    !lookupQuery.isError &&
    matches.length === 0

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title={adminNavTitle("/admin/boletos")}
        description={`Consulta el dueño de un número en ${scopeLabel}.`}
      />

      <Card>
        <CardContent className="pt-6">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
          >
            <AdminRaffleScopeSelect
              id="ticket-lookup-raffle"
              label="Rifa"
              raffles={filterRaffles}
              value={filters.raffleId}
              onValueChange={updateRaffleScope}
              disabled={dashboardQuery.isLoading || filterRaffles.length === 0}
              triggerClassName="min-h-11 w-full"
              placeholder="Rifa actual"
            />

            <label htmlFor="ticket-lookup" className="text-sm font-medium">
              Número de boleto
            </label>
            <InputGroup className="h-11">
              <InputGroupAddon align="inline-start">
                <Ticket className="size-4" aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                id="ticket-lookup"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="0000"
                autoComplete="off"
                className="font-mono text-lg tracking-widest"
                value={draft}
                onChange={(e) => setDraft(normalizeTicketInput(e.target.value))}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="submit"
                  size="sm"
                  disabled={!draft || isBusy}
                  className="min-h-9"
                >
                  <MagnifyingGlass data-icon="inline-start" />
                  {isBusy ? "Buscando…" : "Buscar"}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {lookupQuery.error ? (
              <p className="text-destructive text-sm" role="alert">
                {lookupQuery.error instanceof Error
                  ? lookupQuery.error.message
                  : "No se pudo buscar el boleto"}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {ticket && !isBusy && matches.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            {matches.length === 1
              ? `1 resultado para el boleto ${ticket} en ${scopeLabel}`
              : `${matches.length} rifas con el boleto ${ticket}`}
          </p>
          {matches.map((match) => (
            <TicketLookupResultCard key={`${match.raffle_id}-${match.purchase_id}`} match={match} />
          ))}
        </div>
      ) : null}

      {showEmpty ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            <p className="font-medium text-foreground">No encontramos el boleto {ticket}</p>
            <p className="mt-1">
              Puede estar libre en {scopeLabel}, no haberse vendido aún, o haberse liberado tras
              rechazar la compra.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!ticket ? (
        <p className="text-muted-foreground text-center text-sm">
          Escribe un número de 4 dígitos (0000–9999) para ver el comprador.
        </p>
      ) : null}
    </div>
  )
}

type TicketLookupResultCardProps = {
  match: AdminTicketLookupResult[number]
}

function TicketLookupResultCard({ match }: TicketLookupResultCardProps) {
  const phone = match.customer_phone.replace(/\s/g, "")
  const email = match.customer_email?.trim()
  const isCurrentRaffle = match.raffle_status === "active" || match.raffle_status === "paused"

  return (
    <Card className={cn(isCurrentRaffle && "border-primary/40 ring-1 ring-primary/20")}>
      <CardHeader className="gap-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">{match.raffle_name}</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <RaffleStatusBadge status={match.raffle_status} />
            {isCurrentRaffle ? (
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                Rifa actual
              </span>
            ) : null}
          </div>
        </div>
        <div className={cn(featuredTicketSectionClassName, "gap-2 p-3")}>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className={cn(featuredTicketBadgeClassName, "text-base")}>
              {match.ticket_number}
            </Badge>
            <p className="text-muted-foreground text-sm">
              Estado del boleto: {getStatusLabel(match.ticket_status)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <div className="grid grid-cols-[88px_1fr] gap-x-2 gap-y-1.5 text-sm">
          <span className="text-muted-foreground text-xs">Cliente</span>
          <span className="font-medium break-words">{match.customer_name}</span>
          <span className="text-muted-foreground text-xs">Teléfono</span>
          <a href={`tel:${phone}`} className="text-primary font-medium hover:underline">
            {match.customer_phone}
          </a>
          <span className="text-muted-foreground text-xs">Cédula</span>
          <span>{match.customer_ci?.trim() || "—"}</span>
          <span className="text-muted-foreground text-xs">Email</span>
          <span className="min-w-0 break-all">
            {email ? (
              <a href={`mailto:${email}`} className="text-primary hover:underline">
                {email}
              </a>
            ) : (
              "—"
            )}
          </span>
          <span className="text-muted-foreground text-xs">Ubicación</span>
          <span className="min-w-0 break-words">{match.customer_location?.trim() || "—"}</span>
          <span className="text-muted-foreground text-xs">Compra</span>
          <span className="flex flex-wrap items-center gap-2">
            #{match.purchase_id}
            <PurchaseStatusBadge status={match.purchase_status} />
          </span>
          <span className="text-muted-foreground text-xs">Fecha</span>
          <span>{formatDateTime(match.purchased_at)}</span>
          {match.draw_date ? (
            <>
              <span className="text-muted-foreground text-xs">Sorteo</span>
              <span>{formatDate(match.draw_date)}</span>
            </>
          ) : null}
        </div>

        <Button asChild className="min-h-11 w-full" size="sm">
          <Link
            to="/admin/compras"
            search={{
              purchase: match.purchase_id,
              raffle_id: String(match.raffle_id),
              status: "all",
            }}
          >
            <ArrowSquareOut data-icon="inline-start" />
            Ver compra y gestionar
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
