import { getRaffleEyebrowLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

type RaffleEyebrowProps = {
  status: string
  className?: string
}

function StatusDot({ status }: { status: string }) {
  const isPaused = status === "paused"
  const isActive = status === "active"
  const isFinished = status === "finished"

  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        isActive && "bg-emerald-500",
        isPaused && "bg-amber-500",
        isFinished && "bg-blue-500",
        !isActive && !isPaused && !isFinished && "bg-muted-foreground/50",
      )}
      aria-hidden
    />
  )
}

export function RaffleEyebrow({ status, className }: RaffleEyebrowProps) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium tracking-widest uppercase text-muted-foreground",
        className,
      )}
    >
      <StatusDot status={status} />
      {getRaffleEyebrowLabel(status)}
    </p>
  )
}
