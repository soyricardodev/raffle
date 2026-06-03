import { ArrowSquareOut, MagnifyingGlass, Ticket } from "@phosphor-icons/react"
import { ticketNumberToString } from "@raffle/shared/db/ticket-number"
import { useQuery } from "@tanstack/react-query"
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
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
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import {
  type AdminTicketLookupResult,
  adminTicketLookupQueryOptions,
} from "@/features/admin/tickets/admin-ticket-lookup-queries"
import { formatDate, formatDateTime, getStatusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const routeApi = getRouteApi("/admin/boletos")

function normalizeTicketInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 4)
}

export function AdminTicketLookup() {
  const { ticket: ticketFromUrl } = routeApi.useSearch()
  const navigate = useNavigate({ from: "/admin/boletos" })

  const [draft, setDraft] = useState(ticketFromUrl ?? "")
  const ticket = ticketFromUrl?.trim() ?? ""

  useEffect(() => {
    setDraft(ticketFromUrl ?? "")
  }, [ticketFromUrl])

  const lookupQuery = useQuery(adminTicketLookupQueryOptions(ticket))

  function handleSearch() {
    const digits = normalizeTicketInput(draft)
    if (!digits) return
    const normalized = ticketNumberToString(Number.parseInt(digits, 10))
    void navigate({ search: { ticket: normalized }, replace: true })
  }

  const isBusy = lookupQuery.isFetching
  const matches = lookupQuery.data ?? []
  const showEmpty =
    /^\d{1,4}$/.test(ticket) && !isBusy && !lookupQuery.isError && matches.length === 0

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title={adminNavTitle("/admin/boletos")}
        description="Consulta el dueño de un número en rifas activas o pasadas."
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
              ? `1 resultado para el boleto ${ticket}`
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
              Puede estar libre, no haberse vendido aún, o haberse liberado tras rechazar la compra.
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
      <CardHeader className="gap-2 pb-2">
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
        <p className="text-muted-foreground font-mono text-sm">
          Boleto {match.ticket_number} · {getStatusLabel(match.ticket_status)}
        </p>
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
              page: 1,
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
