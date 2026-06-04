import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { buildVerifyHref } from "@/features/verify/build-verify-href"
import { marqueeDurationSec } from "@/features/raffle/PurchaseActivityMarquee"
import { cn } from "@/lib/utils"

export type LivePurchaseActivityVariant = "live" | "idle" | "finished"

export type TickerViewModel = {
  label: ReactNode
  marqueeItems: string[]
  ariaSummary: string
  marqueeDurationSec: number
  isLiveBar?: boolean
}

const IDLE_MARQUEE = ["Sin rifa activa", "Verifica tus boletos", "Rifas publicadas abajo"]

const FINISHED_MARQUEE = ["Rifa finalizada", "Verifica tus boletos", "Más rifas en inicio"]

function peopleOnlineMessage(count: number): string {
  return `${count} persona${count === 1 ? "" : "s"} en línea ahora`
}

export function buildTickerViewModel(
  variant: LivePurchaseActivityVariant,
  ctx: { activeBuyersCount: number },
): TickerViewModel {
  if (variant === "idle") {
    return {
      label: (
        <StaticActivityLabel>
          <Link {...buildVerifyHref()} className="text-foreground hover:underline">
            Sin rifa activa
          </Link>
        </StaticActivityLabel>
      ),
      marqueeItems: IDLE_MARQUEE,
      ariaSummary: "No hay rifa activa. Verifica tus boletos o revisa rifas publicadas.",
      marqueeDurationSec: 32,
    }
  }

  if (variant === "finished") {
    return {
      label: (
        <StaticActivityLabel dotClassName="bg-amber-500/80">
          <span className="text-amber-800 dark:text-amber-200">Finalizada</span>
        </StaticActivityLabel>
      ),
      marqueeItems: FINISHED_MARQUEE,
      ariaSummary: "Esta rifa ya finalizó.",
      marqueeDurationSec: 32,
    }
  }

  const marqueeItems = [peopleOnlineMessage(ctx.activeBuyersCount)]

  return {
    label: (
      <LiveActivityLabel
        count={ctx.activeBuyersCount}
        pulse={ctx.activeBuyersCount > 0}
      />
    ),
    marqueeItems,
    ariaSummary: peopleOnlineMessage(ctx.activeBuyersCount),
    marqueeDurationSec: marqueeDurationSec(marqueeItems.length),
    isLiveBar: true,
  }
}

function LiveActivityLabel({ count, pulse }: { count: number; pulse: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 text-[11px] leading-none font-medium whitespace-nowrap sm:text-xs"
      title={
        count > 0
          ? `${count} persona${count === 1 ? "" : "s"} en la página de compra`
          : "Actividad en tiempo real"
      }
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full bg-emerald-500",
          pulse && "live-activity-pulse-dot",
        )}
        aria-hidden
      />
      <span className="text-emerald-700 dark:text-emerald-400">En vivo</span>
      {count > 0 ? (
        <span className="text-muted-foreground font-normal">· {count} en línea</span>
      ) : null}
    </span>
  )
}

function StaticActivityLabel({
  children,
  dotClassName,
}: {
  children: ReactNode
  dotClassName?: string
}) {
  return (
    <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1.5 text-[11px] leading-none font-medium whitespace-nowrap sm:text-xs">
      <span
        className={cn("size-1.5 shrink-0 rounded-full bg-muted-foreground/50", dotClassName)}
        aria-hidden
      />
      {children}
    </span>
  )
}
