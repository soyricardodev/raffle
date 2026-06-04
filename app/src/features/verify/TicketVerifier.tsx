import { MagnifyingGlassIcon, UserCircleIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { buyerFirstName } from "@/features/raffle/purchase-form/buyer-profile-storage"
import { CiInputField } from "@/features/raffle/purchase-form/CiInputField"
import { PhoneInputField } from "@/features/raffle/purchase-form/PhoneInputField"
import { TicketVerifierEmpty } from "@/features/verify/TicketVerifierEmpty"
import { useTicketVerify } from "@/features/verify/use-ticket-verify"
import { VerifiedTicketsList } from "@/features/verify/VerifiedTicketsList"
import { VerifyPurchaseStatusLegend } from "@/features/verify/VerifyPurchaseStatusLegend"
import type { VerifyRouteSearch } from "@/features/verify/verify-route-search"
import { VerifySearchMethodPicker } from "@/features/verify/VerifySearchMethodPicker"
import { maskPhoneTail } from "@/features/verify/verify-profile"
import {
  VERIFY_SEARCH_METHODS,
  verifySearchMethodLabel,
} from "@/features/verify/verify-search-config"

type TicketVerifierProps = {
  initialSearch?: VerifyRouteSearch
}

export function TicketVerifier({ initialSearch }: TicketVerifierProps) {
  const {
    resultsRef,
    form,
    patchForm,
    setMethod,
    uiMode,
    enterManual,
    enterQuick,
    savedProfile,
    verifyMutation,
    runSearch,
    runQuickPhoneSearch,
  } = useTicketVerify({ initialSearch })

  const tickets = verifyMutation.data ?? []
  const hasSearched = verifyMutation.isSuccess
  const showQuickSearch = savedProfile != null && uiMode === "quick"
  const showManualForm = uiMode === "manual"
  const methodConfig = VERIFY_SEARCH_METHODS.find((m) => m.value === form.method)

  const firstName = savedProfile ? buyerFirstName(savedProfile.customerName) : ""

  return (
    <div className="space-y-6">
      {showQuickSearch && savedProfile && (
        <Card className="border-primary/20 bg-primary/5 py-0 shadow-none">
          <CardContent className="space-y-3 px-4 py-4">
            <div className="flex gap-3">
              <UserCircleIcon
                className="text-primary mt-0.5 size-8 shrink-0"
                weight="duotone"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">
                  {firstName ? `Hola, ${firstName}` : "Tus datos están guardados"}
                </p>
                <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                  Un toque para ver tus boletos con el teléfono de tu última compra.
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="min-h-11 w-full text-base font-semibold"
              disabled={verifyMutation.isPending}
              onClick={runQuickPhoneSearch}
            >
              <MagnifyingGlassIcon className="mr-2 size-5" weight="bold" aria-hidden />
              {verifyMutation.isPending
                ? "Buscando…"
                : `Ver mis boletos (${maskPhoneTail(savedProfile.customerPhone)})`}
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-muted-foreground h-auto w-full px-0 text-sm"
              onClick={enterManual}
            >
              Buscar con otro teléfono, cédula o boleto
            </Button>
          </CardContent>
        </Card>
      )}

      {showManualForm && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            runSearch()
          }}
        >
          {savedProfile && (
            <Button
              type="button"
              variant="link"
              size="xs"
              className="text-muted-foreground -mt-2 h-auto px-0 text-xs"
              onClick={enterQuick}
            >
              Volver a búsqueda rápida
            </Button>
          )}

          <VerifySearchMethodPicker
            value={form.method}
            disabled={verifyMutation.isPending}
            onChange={setMethod}
          />

          <div className="pt-1">
            {form.method === "phone" ? (
              <PhoneInputField
                value={form.phone}
                mode={form.phoneMode}
                disabled={verifyMutation.isPending}
                onChange={(phone) => patchForm({ phone })}
                onModeChange={(phoneMode) => patchForm({ phoneMode })}
              />
            ) : form.method === "cedula" ? (
              <CiInputField
                prefix={form.ciPrefix}
                number={form.ciNumber}
                disabled={verifyMutation.isPending}
                onPrefixChange={(ciPrefix) => patchForm({ ciPrefix })}
                onNumberChange={(ciNumber) => patchForm({ ciNumber })}
              />
            ) : (
              <Field>
                <FieldLabel htmlFor={`verify-${form.method}`}>{methodConfig?.label}</FieldLabel>
                <Input
                  id={`verify-${form.method}`}
                  value={form.text}
                  onChange={(event) => patchForm({ text: event.target.value })}
                  placeholder={methodConfig?.placeholder}
                  className="min-h-11"
                  disabled={verifyMutation.isPending}
                  autoComplete={form.method === "email" ? "email" : "off"}
                  inputMode={form.method === "ticket" ? "numeric" : undefined}
                />
                {form.method === "ticket" && (
                  <FieldDescription>
                    El número impreso en tu boleto, sin el símbolo #.
                  </FieldDescription>
                )}
              </Field>
            )}
          </div>

          <Button
            type="submit"
            disabled={verifyMutation.isPending}
            className="min-h-11 w-full text-base font-semibold shadow-sm"
          >
            <MagnifyingGlassIcon className="mr-2 size-5" weight="bold" aria-hidden />
            {verifyMutation.isPending ? "Buscando…" : "Buscar boletos"}
          </Button>
        </form>
      )}

      <div ref={resultsRef} id="verify-results" className="scroll-mt-20 space-y-4">
        {verifyMutation.isPending && (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando resultados">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        )}

        {hasSearched && !verifyMutation.isPending && tickets.length === 0 && (
          <TicketVerifierEmpty searchLabel={verifySearchMethodLabel(form.method)} />
        )}

        {tickets.length > 0 && !verifyMutation.isPending && (
          <>
            <VerifiedTicketsList tickets={tickets} />
            <VerifyPurchaseStatusLegend />
          </>
        )}
      </div>
    </div>
  )
}
