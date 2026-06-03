import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00"
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

type PromotionCountdownProps = {
  endsAt: string
  className?: string
  compact?: boolean
}

export function PromotionCountdown({ endsAt, className, compact }: PromotionCountdownProps) {
  const endMs = new Date(endsAt).getTime()

  // Defer Date.now() until after hydration; SSR and client must render the same placeholder.
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, endMs - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [endMs])

  if (remaining !== null && remaining <= 0) return null

  const displayText = remaining === null ? "--:--:--" : formatRemaining(remaining)

  return (
    <span
      className={className}
      aria-live="polite"
      data-testid="promotion-countdown"
    >
      {!compact ? (
        <Clock className="mr-1 inline size-3.5 shrink-0" aria-hidden />
      ) : null}
      <span className="font-mono font-semibold tabular-nums">{displayText}</span>
      {!compact ? (
        <span className="text-muted-foreground ml-1 text-xs font-normal">restantes</span>
      ) : null}
    </span>
  )
}
