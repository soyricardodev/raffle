import { Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Prize = {
  name: string
  description?: string | null
  position?: number | string
  image_url?: string | null
}

export function PrizesSection({ prizes }: { prizes: Prize[] }) {
  if (!prizes.length) return null

  const sorted = [...prizes].sort(
    (a, b) => Number(a.position ?? 0) - Number(b.position ?? 0),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="size-5 text-amber-500" />
          Premios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((prize, index) => (
            <div
              key={`${prize.name}-${index}`}
              className="flex gap-3 rounded-xl border bg-muted/30 p-3"
            >
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {prize.position ?? index + 1}
              </div>
              <div className="min-w-0">
                <p className="font-medium">{prize.name}</p>
                {prize.description && (
                  <p className="text-muted-foreground mt-0.5 text-sm">{prize.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
