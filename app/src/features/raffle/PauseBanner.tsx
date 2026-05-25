import { useQuery } from "@tanstack/react-query"
import { Clock } from "lucide-react"
import { publicFetch } from "@/lib/admin-fetch"

type PauseInfo = {
  isPaused: boolean
  reason?: string
  remainingSeconds?: number
}

export function PauseBanner({ raffleId }: { raffleId: number | string }) {
  const { data } = useQuery({
    queryKey: ["raffle", raffleId, "pause-info"],
    queryFn: () => publicFetch<PauseInfo>(`/api/raffles/${raffleId}/pause-info`),
    refetchInterval: 5_000,
  })

  if (!data?.isPaused) return null

  const minutes = Math.floor((data.remainingSeconds ?? 0) / 60)
  const seconds = (data.remainingSeconds ?? 0) % 60

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-medium text-amber-900 dark:text-amber-100">Rifa pausada temporalmente</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {data.reason ? `${data.reason}. ` : ""}
            {data.remainingSeconds != null && data.remainingSeconds > 0
              ? `Reanuda en ${minutes}:${String(seconds).padStart(2, "0")}.`
              : "Vuelve a intentar en unos minutos."}
          </p>
        </div>
      </div>
    </div>
  )
}
