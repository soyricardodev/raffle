import { Clock, RefreshCw } from "lucide-react"
import { useRaffleLiveDataOrFetch } from "@/features/raffle/raffle-live-context"

export function PauseBanner({ raffleId }: { raffleId: number | string }) {
  const { data } = useRaffleLiveDataOrFetch(raffleId)

  if (!data?.isPaused) return null

  const totalSeconds = data.remainingSeconds ?? 0
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const countdown =
    totalSeconds > 0 ? `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : null

  const title = data.pauseContext?.title ?? "Ventas pausadas temporalmente"
  const description =
    data.pauseContext?.description ??
    "Estamos procesando muchas compras. Vuelve en un momento para continuar."

  return (
    <div
      role="status"
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <Clock className="size-5 text-amber-700 dark:text-amber-300" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-semibold text-amber-950 dark:text-amber-50">{title}</p>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
          {countdown ? (
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="font-mono text-2xl font-bold tracking-wider text-amber-900 tabular-nums dark:text-amber-100"
                aria-live="polite"
              >
                {countdown}
              </span>
              <span className="text-muted-foreground text-xs">hasta reanudar ventas</span>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-200">
              <RefreshCw className="size-4 shrink-0" />
              Actualiza la página en unos minutos
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
