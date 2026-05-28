import { useState } from "react"
import { CaretRight, SlidersHorizontal } from "@phosphor-icons/react"
import type { RaffleStatus } from "@raffle/shared/validators"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { RaffleStatusBadge } from "@/features/admin/raffles/RaffleStatusBadge"
import {
  getConfirmCopy,
  getLifecyclePhase,
  getMoreStatusOptions,
  getPrimaryLifecycleActions,
  getStatusHint,
  PHASE_LABELS,
  type LifecycleConfirm,
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
  status: string
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
  const current = status as RaffleStatus
  const published = Boolean(publish)
  const phase = getLifecyclePhase(current)
  const { run, pending } = useAdminRaffleLifecycle(raffleId)

  const [moreOpen, setMoreOpen] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<LifecycleConfirm | null>(null)

  const primaryActions = getPrimaryLifecycleActions(current, published)
  const moreOptions = getMoreStatusOptions(current)
  const confirmCopy = pendingConfirm
    ? getConfirmCopy(pendingConfirm, raffleName)
    : null

  function requestConfirm(confirm: LifecycleConfirm) {
    setMoreOpen(false)
    setPendingConfirm(confirm)
  }

  return (
    <>
      <Card size="sm" className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ciclo de venta</CardTitle>
          <CardDescription>Gestiona el estado y las ventas de la rifa</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LifecycleStepper phase={phase} status={current} />

          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <RaffleStatusBadge status={status} />
              {current === "paused" ? (
                <span className="text-muted-foreground text-xs">dentro de «En venta»</span>
              ) : null}
              {current === "finished" && published ? (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                  Publicada
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {getStatusHint(current, published)}
            </p>
          </div>

          {primaryActions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {primaryActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={pending}
                    onClick={() => requestConfirm(action.confirm)}
                    className={cn(
                      "flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      "hover:bg-muted/60 active:bg-muted disabled:pointer-events-none disabled:opacity-50",
                      action.variant === "destructive" &&
                        "border-destructive/30 bg-destructive/5 hover:bg-destructive/10",
                      action.variant === "default" &&
                        "border-primary/30 bg-primary/5 hover:bg-primary/10",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        action.variant === "destructive"
                          ? "bg-destructive/15 text-destructive"
                          : action.variant === "default"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-foreground",
                      )}
                    >
                      <Icon className="size-5" weight="duotone" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{action.label}</span>
                      <span className="text-muted-foreground block text-xs leading-snug">
                        {action.description}
                      </span>
                    </span>
                    <CaretRight className="text-muted-foreground size-4 shrink-0" />
                  </button>
                )
              })}
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
              Cambios avanzados. Úsalos solo si el flujo principal no aplica.
            </SheetDescription>
          </SheetHeader>
          <ul className="mt-4 flex flex-col gap-2">
            {moreOptions.map((option) => {
              const Icon = option.icon
              return (
                <li key={option.status}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => requestConfirm({ status: option.status })}
                    className={cn(
                      "flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-3 py-3 text-left",
                      "hover:bg-muted/60 active:bg-muted disabled:opacity-50",
                      option.destructive && "border-destructive/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted",
                        option.destructive && "bg-destructive/15 text-destructive",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="text-muted-foreground block text-xs">
                        {option.description}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </SheetContent>
      </Sheet>

      {confirmCopy ? (
        <ConfirmAction
          open={pendingConfirm !== null}
          onOpenChange={(open) => !open && setPendingConfirm(null)}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          destructive={confirmCopy.destructive}
          pending={pending}
          onConfirm={() => {
            if (pendingConfirm) run(pendingConfirm)
            setPendingConfirm(null)
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
