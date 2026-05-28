import { useState } from "react"
import { SlidersHorizontal } from "@phosphor-icons/react"
import type { RaffleStatus, TransitionRaffleInput } from "@raffle/shared/validators"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { RaffleStatusBadge } from "@/features/admin/raffles/RaffleStatusBadge"
import { LifecycleOptionButton } from "@/features/admin/raffles/LifecycleOptionButton"
import {
  getConfirmCopy,
  getLifecyclePhase,
  getMoreStatusOptions,
  getPrimaryLifecycleActions,
  getStatusHint,
  PHASE_LABELS,
  type LifecyclePhase,
} from "@/features/admin/raffles/raffle-lifecycle-ui"
import { useAdminRaffleLifecycle } from "@/features/admin/raffles/use-admin-raffle-lifecycle"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate } from "@/lib/format"

const PHASES: LifecyclePhase[] = ["prep", "selling", "closed"]

type AdminRaffleStatusControlProps = {
  raffleId: string
  raffleName: string
  status: RaffleStatus
  publish: boolean
  drawDate: string | null
  priceBs: number
  priceUsd: number
  minPurchase: number
  maxPurchase: number
}

export function AdminRaffleStatusControl({
  raffleId,
  raffleName,
  status,
  publish,
  drawDate,
  priceBs,
  priceUsd,
  minPurchase,
  maxPurchase,
}: AdminRaffleStatusControlProps) {
  const published = Boolean(publish)
  const phase = getLifecyclePhase(status)
  const { run, pending } = useAdminRaffleLifecycle(raffleId)

  const [moreOpen, setMoreOpen] = useState(false)
  const [pendingRequest, setPendingRequest] = useState<TransitionRaffleInput | null>(
    null,
  )

  const primaryActions = getPrimaryLifecycleActions(status, published)
  const moreOptions = getMoreStatusOptions(status)
  const confirmCopy = pendingRequest
    ? getConfirmCopy(pendingRequest, raffleName)
    : null

  function requestConfirm(request: TransitionRaffleInput) {
    setMoreOpen(false)
    setPendingRequest(request)
  }

  return (
    <>
      <Card size="sm" className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ciclo de venta</CardTitle>
          <CardDescription>Gestiona el estado y las ventas de la rifa</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LifecycleStepper phase={phase} status={status} />

          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <RaffleStatusBadge status={status} />
              {status === "paused" ? (
                <span className="text-muted-foreground text-xs">dentro de «En venta»</span>
              ) : null}
              {status === "finished" && published ? (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                  Publicada
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {getStatusHint(status, published)}
            </p>
          </div>

          {primaryActions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {primaryActions.map((action) => (
                <LifecycleOptionButton
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  description={action.description}
                  disabled={pending}
                  destructive={action.variant === "destructive"}
                  primary={action.variant === "default"}
                  onClick={() => requestConfirm(action.request)}
                />
              ))}
            </div>
          ) : null}

          {moreOptions.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground min-h-11 w-full justify-center gap-2"
              disabled={pending}
              onClick={() => setMoreOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              Más opciones de estado
            </Button>
          ) : null}

          <Separator />

          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Sorteo</dt>
              <dd className="text-right font-medium">
                {drawDate ? formatDate(drawDate) : "Hasta agotar boletos"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Precios</dt>
              <dd className="text-right font-medium tabular-nums">
                {formatCurrency(priceBs)} · {formatCurrency(priceUsd, "USD")}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Compra</dt>
              <dd className="text-right font-medium tabular-nums">
                {minPurchase}–{maxPurchase} boletos
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
          <SheetHeader className="text-left">
            <SheetTitle>Otros estados</SheetTitle>
            <SheetDescription>
              Cambios avanzados. Algunos atajos del flujo principal no están aquí.
            </SheetDescription>
          </SheetHeader>
          <ul className="mt-4 flex flex-col gap-2">
            {moreOptions.map((option) => (
              <li key={option.status}>
                <LifecycleOptionButton
                  icon={option.icon}
                  label={option.label}
                  description={option.description}
                  disabled={pending}
                  destructive={option.destructive}
                  onClick={() =>
                    requestConfirm({ intent: "set_status", status: option.status })
                  }
                />
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>

      {confirmCopy ? (
        <ConfirmAction
          open={pendingRequest !== null}
          onOpenChange={(open) => !open && setPendingRequest(null)}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          destructive={confirmCopy.destructive}
          pending={pending}
          onConfirm={() => {
            if (pendingRequest) run(pendingRequest)
            setPendingRequest(null)
          }}
        />
      ) : null}
    </>
  )
}

function LifecycleStepper({
  phase,
  status,
}: {
  phase: LifecyclePhase
  status: RaffleStatus
}) {
  const phaseIndex = PHASES.indexOf(phase)

  return (
    <div className="flex flex-col gap-2" aria-label="Progreso del ciclo de venta">
      <div className="flex items-center gap-1">
        {PHASES.map((step, index) => {
          const isPast = index < phaseIndex
          const isCurrent = index === phaseIndex
          return (
            <div key={step} className="flex min-w-0 flex-1 items-center gap-1">
              <div
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  isPast || isCurrent ? "bg-primary" : "bg-muted",
                  isCurrent && status === "paused" && "bg-amber-500",
                )}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between gap-1 text-[11px] font-medium tracking-tight">
        {PHASES.map((step, index) => (
          <span
            key={step}
            className={cn(
              "min-w-0 flex-1 text-center",
              index === phaseIndex ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {PHASE_LABELS[step]}
          </span>
        ))}
      </div>
    </div>
  )
}
