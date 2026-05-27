import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { publicFetch } from "@/lib/admin-fetch"
import type { VerifyTicketInput } from "@raffle/shared/validators"
import { VerifyTicketInput as VerifyTicketSchema } from "@raffle/shared/validators"
import { CreditCard, Mail, Phone, Search, Ticket, TicketX } from "lucide-react"
import { formatDate, getPurchaseStatusClass, getStatusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

type VerifiedTicket = {
  ticket_number: string
  raffle_name: string
  draw_date: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_cedula: string | null
  purchase_status: string | null
  status: string
}

const searchOptions = [
  { value: "phone", label: "Teléfono", icon: Phone, placeholder: "Ej: 04121234567" },
  { value: "cedula", label: "Cédula", icon: CreditCard, placeholder: "Ej: V12345678" },
  { value: "email", label: "Email", icon: Mail, placeholder: "Ej: correo@email.com" },
  { value: "ticket", label: "Boleto", icon: Ticket, placeholder: "Ej: 1234" },
] as const

type SearchType = (typeof searchOptions)[number]["value"]

export function TicketVerifier({ compact = false }: { compact?: boolean }) {
  const [searchType, setSearchType] = useState<SearchType>("phone")
  const [searchValue, setSearchValue] = useState("")

  const verifyMutation = useMutation({
    mutationFn: async (input: VerifyTicketInput) => {
      return publicFetch<VerifiedTicket[]>("/api/tickets/verify", {
        method: "POST",
        body: JSON.stringify(input),
      })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const currentOption = searchOptions.find((option) => option.value === searchType)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = searchValue.trim()
    if (!trimmed) {
      toast.error("Ingresa un valor para buscar")
      return
    }

    const payload: VerifyTicketInput = {
      phone: searchType === "phone" ? trimmed : undefined,
      cedula: searchType === "cedula" ? trimmed : undefined,
      email: searchType === "email" ? trimmed : undefined,
      ticketNumber: searchType === "ticket" ? trimmed : undefined,
    }

    const parsed = VerifyTicketSchema.safeParse(payload)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos")
      return
    }

    verifyMutation.mutate(parsed.data)
  }

  const tickets = verifyMutation.data ?? []
  const hasSearched = verifyMutation.isSuccess

  return (
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div
          className={cn(
            "flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            !compact && "sm:grid sm:grid-cols-4 sm:overflow-visible",
          )}
          role="tablist"
          aria-label="Tipo de búsqueda"
        >
          {searchOptions.map((option) => {
            const Icon = option.icon
            const active = searchType === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSearchType(option.value)
                  setSearchValue("")
                }}
                className={cn(
                  "min-h-11 min-w-[5.5rem] shrink-0 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 sm:min-w-0",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40",
                )}
              >
                <Icon className="mb-1 size-4 text-primary" aria-hidden />
                <p className="text-sm font-medium">{option.label}</p>
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          <Label htmlFor="search-value">{currentOption?.label}</Label>
          <Input
            id="search-value"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={currentOption?.placeholder}
            className="min-h-11"
            autoComplete={searchType === "email" ? "email" : searchType === "phone" ? "tel" : "off"}
          />
        </div>

        <Button
          type="submit"
          disabled={verifyMutation.isPending}
          className="min-h-11 w-full sm:w-auto"
        >
          <Search className="mr-2 size-4" />
          {verifyMutation.isPending ? "Buscando…" : "Verificar boletos"}
        </Button>
      </form>

      {hasSearched && tickets.length === 0 && (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <TicketX className="text-muted-foreground/40 size-10" />
            <div>
              <p className="font-medium">No encontramos boletos</p>
              <p className="text-muted-foreground mt-1 max-w-xs text-sm">
                Revisa que el {currentOption?.label.toLowerCase()} coincida con el de tu compra. Si
                acabas de pagar, puede tardar unos minutos en aparecer.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {tickets.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {tickets.length} boleto{tickets.length === 1 ? "" : "s"} encontrado
            {tickets.length === 1 ? "" : "s"}
          </p>
          {tickets.map((ticket) => (
            <Card key={`${ticket.raffle_name}-${ticket.ticket_number}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="font-mono">#{ticket.ticket_number}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${getPurchaseStatusClass(ticket.purchase_status ?? "pending")}`}
                  >
                    {getStatusLabel(ticket.purchase_status ?? "pending")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-1.5 text-sm">
                <p>
                  <span className="text-foreground font-medium">Rifa:</span> {ticket.raffle_name}
                </p>
                <p>
                  <span className="text-foreground font-medium">Sorteo:</span>{" "}
                  {formatDate(ticket.draw_date)}
                </p>
                {ticket.customer_name && (
                  <p>
                    <span className="text-foreground font-medium">Titular:</span>{" "}
                    {ticket.customer_name}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
