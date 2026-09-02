import { SALE_PUSH_MILESTONES } from "@raffle/shared/push"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdminPushPlan, AdminPushPlanItem } from "@/features/admin/push/admin-push-queries"
import { formatPlanItemDetail, formatSoldPercent } from "@/features/admin/push/push-plan-format"
import { formatPushLastSeen } from "@/features/admin/push/push-subscriber-format"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

const SKELETON_ROWS = ["one", "two", "three"] as const

export function AdminPushPlanCard({
  loading,
  plan,
}: {
  loading: boolean
  plan: AdminPushPlan | undefined
}) {
  if (loading) return <PushPlanSkeleton />
  if (!plan?.raffle) {
    return (
      <div className="rounded-2xl border px-4 py-10 text-center">
        <p className="text-sm font-medium">Sin rifa en curso</p>
        <p className="text-muted-foreground mx-auto mt-1 max-w-[16rem] text-sm">
          Cuando publiques una, aquí ves qué avisos ya salieron y cuál sigue.
        </p>
      </div>
    )
  }

  const nextKey =
    plan.milestones.find((item) => item.status === "upcoming")?.key ??
    plan.promotions.find((item) => item.status === "upcoming")?.key ??
    null
  const milestoneRows = plan.milestones.filter((item) => item.status !== "skipped")

  return (
    <div className="overflow-hidden rounded-2xl border">
      <PlanHeader
        name={plan.raffle.name}
        soldPercent={plan.raffle.soldPercent}
        ticketsSold={plan.raffle.ticketsSold}
        totalTickets={plan.raffle.totalTickets}
        milestones={plan.milestones}
        nextMilestoneId={plan.milestones.find((item) => item.key === nextKey)?.milestoneId ?? null}
      />

      <ol className="border-t px-3 py-2">
        {milestoneRows.map((item, index) => (
          <PlanItemRow
            key={item.key}
            item={item}
            isNext={item.key === nextKey}
            isLast={index === milestoneRows.length - 1}
          />
        ))}
      </ol>

      <div className="border-t px-3 py-2">
        <p className="text-muted-foreground px-1 pb-1 text-[11px] font-medium">Promos</p>
        {plan.promotions.length ? (
          <ol>
            {plan.promotions.map((item, index) => (
              <PlanItemRow
                key={item.key}
                item={item}
                isNext={item.key === nextKey}
                isLast={index === plan.promotions.length - 1}
              />
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground px-1 py-2 text-sm">Se avisa al activar una promo.</p>
        )}
      </div>
    </div>
  )
}

function PlanHeader({
  name,
  soldPercent,
  ticketsSold,
  totalTickets,
  milestones,
  nextMilestoneId,
}: {
  name: string
  soldPercent: number
  ticketsSold: number
  totalTickets: number
  milestones: AdminPushPlanItem[]
  nextMilestoneId: AdminPushPlanItem["milestoneId"]
}) {
  const soldLabel = formatSoldPercent(soldPercent)

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px] font-medium">Rifa actual</p>
          <p className="font-heading mt-0.5 truncate text-lg font-semibold tracking-tight">
            {name}
          </p>
        </div>
        <p className="font-heading text-2xl leading-none font-semibold tabular-nums">{soldLabel}</p>
      </div>
      <SaleTrack
        soldPercent={soldPercent}
        milestones={milestones}
        nextMilestoneId={nextMilestoneId}
      />
      <p className="text-muted-foreground text-xs tabular-nums">
        {ticketsSold.toLocaleString("es-VE")} de {totalTickets.toLocaleString("es-VE")} boletos
      </p>
    </div>
  )
}

function SaleTrack({
  soldPercent,
  milestones,
  nextMilestoneId,
}: {
  soldPercent: number
  milestones: AdminPushPlanItem[]
  nextMilestoneId: AdminPushPlanItem["milestoneId"]
}) {
  const width = Math.min(100, Math.max(0, soldPercent))
  const byId = new Map(milestones.map((item) => [item.milestoneId, item]))

  return (
    <div
      className="relative h-2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
      aria-label={`${formatSoldPercent(soldPercent)} vendido`}
    >
      <div className="bg-muted absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full" />
      <div
        className="bg-primary absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
        style={{ width: `${width}%` }}
      />
      {SALE_PUSH_MILESTONES.map((mark) => {
        const item = byId.get(mark.id)
        const isNext = item?.milestoneId === nextMilestoneId
        const sent = item?.status === "sent"
        const skipped = item?.status === "skipped"
        return (
          <span
            key={mark.id}
            className={cn(
              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
              isNext
                ? "bg-primary size-2 ring-4 ring-primary/25"
                : sent
                  ? "bg-primary size-1.5 ring-2 ring-background"
                  : skipped
                    ? "bg-muted-foreground/45 size-1.5 ring-2 ring-background"
                    : "border-muted-foreground/40 size-1.5 border bg-background ring-2 ring-background",
            )}
            style={{ left: `${mark.minPercent}%` }}
            title={
              sent
                ? `Enviada al ${mark.minPercent}%`
                : skipped
                  ? `Omitida al ${mark.minPercent}%`
                  : `Aviso al ${mark.minPercent}%`
            }
          />
        )
      })}
    </div>
  )
}

function PlanItemRow({
  item,
  isNext,
  isLast,
}: {
  item: AdminPushPlanItem
  isNext: boolean
  isLast: boolean
}) {
  const skipped = item.status === "skipped"
  const sent = item.status === "sent"
  const detail = formatPlanItemDetail(item)

  return (
    <li
      className={cn(
        "relative flex gap-3 px-1 py-2",
        isNext && "bg-primary/8 my-0.5 rounded-2xl px-2.5 py-2.5 ring-1 ring-primary/12",
        skipped && "text-muted-foreground",
      )}
    >
      <span className="relative flex w-4 shrink-0 flex-col items-center self-stretch">
        {!isLast ? (
          <span
            className="bg-border absolute top-[11px] left-1/2 h-[calc(100%-2px)] w-px -translate-x-1/2"
            aria-hidden
          />
        ) : null}
        <PlanDot status={item.status} isNext={isNext} />
      </span>

      <span className="min-w-0 flex-1">
        {isNext ? <span className="text-primary text-[11px] font-medium">Siguiente</span> : null}
        <span className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              "min-w-0 truncate",
              isNext
                ? "font-heading text-[15px] font-semibold tracking-tight"
                : "text-sm font-medium",
              skipped && "text-muted-foreground",
            )}
          >
            {item.title}
          </span>
          {sent && item.sentAt ? (
            <time
              className="text-muted-foreground shrink-0 text-[11px] tabular-nums"
              dateTime={item.sentAt}
              title={formatDateTime(item.sentAt)}
            >
              {formatPushLastSeen(item.sentAt)}
            </time>
          ) : null}
        </span>
        <span
          className={cn(
            "mt-0.5 block text-xs",
            isNext ? "text-foreground/80 tabular-nums" : "text-muted-foreground",
          )}
        >
          {detail}
        </span>
      </span>
    </li>
  )
}

function PlanDot({ status, isNext }: { status: AdminPushPlanItem["status"]; isNext: boolean }) {
  return (
    <span
      className={cn(
        "relative z-[1] mt-1.5 rounded-full",
        isNext && "bg-primary size-2.5",
        !isNext && status === "sent" && "bg-primary size-2",
        !isNext && status === "skipped" && "bg-muted-foreground/35 mt-2 size-1.5",
        !isNext &&
          status === "upcoming" &&
          "border-muted-foreground/40 size-2 border-2 bg-background",
      )}
      aria-hidden
    />
  )
}

function PushPlanSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <span className="flex items-end justify-between gap-3">
          <span>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-5 w-36" />
          </span>
          <Skeleton className="h-7 w-14" />
        </span>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
      <ul className="border-t px-4 py-2">
        {SKELETON_ROWS.map((id) => (
          <li key={id} className="flex items-start gap-3 py-2">
            <Skeleton className="mt-1 size-2 shrink-0 rounded-full" />
            <span className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="mt-1.5 h-3 w-24" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
