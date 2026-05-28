import { Pause } from "lucide-react"
import { getRaffleStatusClass, getStatusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

type HomeRaffleCoverProps = {
  name: string
  imageUrl: string
  status?: string
}

export function HomeRaffleCover({ name, imageUrl, status = "active" }: HomeRaffleCoverProps) {
  const isPaused = status === "paused"

  return (
    <figure className="relative -mx-4 aspect-[4/3] w-auto overflow-hidden sm:mx-0 sm:rounded-xl">
      <img
        src={imageUrl}
        alt={name}
        className="size-full object-cover"
        fetchPriority="high"
        decoding="async"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10"
        aria-hidden
      />
      <figcaption className="absolute inset-0 flex flex-col justify-between p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-medium tracking-wide text-white/80 uppercase">
            Rifa en curso
          </span>
          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              getRaffleStatusClass(status),
            )}
          >
            {isPaused ? "Pausada" : getStatusLabel(status)}
          </span>
        </div>
        <h1 className="font-heading text-xl font-semibold leading-snug text-balance text-white sm:text-2xl">
          {name}
        </h1>
      </figcaption>
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
          <span className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-amber-950">
            <Pause className="size-3.5" />
            Ventas pausadas
          </span>
        </div>
      )}
    </figure>
  )
}
