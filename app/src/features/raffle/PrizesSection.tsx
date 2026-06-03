import { Gift, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Prize = {
  name: string
  description?: string | null
  position?: number | string
  image_url?: string | null
}

export function PrizesSection({ prizes }: { prizes: Prize[] }) {
  if (!prizes.length) return null

  const sorted = [...prizes].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="size-5 text-amber-500" />
          Premios ({sorted.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((prize, index) => (
            <div
              key={`${prize.name}-${index}`}
              className="flex gap-3 overflow-hidden rounded-xl border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
            >
              {prize.image_url ? (
                <img
                  src={prize.image_url}
                  alt={prize.name}
                  className="size-16 shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="bg-primary/10 text-primary flex size-16 shrink-0 flex-col items-center justify-center rounded-lg">
                  <Gift className="mb-0.5 size-5 opacity-70" />
                  <span className="text-xs font-bold">{prize.position ?? index + 1}°</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{prize.name}</p>
                {prize.description && (
                  <p className="text-muted-foreground mt-1 text-sm line-clamp-2">
                    {prize.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
