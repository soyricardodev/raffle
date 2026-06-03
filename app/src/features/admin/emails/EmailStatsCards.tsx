import {
  CheckCircleIcon,
  ClockIcon,
  EnvelopeSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { EmailLogStats } from "@/features/admin/emails/types"
import { cn } from "@/lib/utils"

type EmailStatsCardsProps = {
  stats: EmailLogStats | undefined
  loading?: boolean
}

const cards = [
  { key: "total" as const, label: "Total", icon: EnvelopeSimpleIcon, className: "" },
  { key: "sent" as const, label: "Enviados", icon: CheckCircleIcon, className: "text-emerald-600" },
  {
    key: "failed" as const,
    label: "Fallidos",
    icon: WarningCircleIcon,
    className: "text-red-600",
    includeError: true,
  },
  { key: "pending" as const, label: "Pendientes", icon: ClockIcon, className: "text-amber-600" },
]

function statValue(stats: EmailLogStats, key: (typeof cards)[number]["key"], includeError?: boolean) {
  if (key === "failed" && includeError) return (stats.failed + stats.error).toLocaleString("es-VE")
  return stats[key].toLocaleString("es-VE")
}

export function EmailStatsCards({ stats, loading }: EmailStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map(({ key, label, icon: Icon, className, includeError }) => (
        <Card key={key} size="sm">
          <CardContent className="flex items-center justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-[11px] font-medium">{label}</p>
              {loading && !stats ? (
                <Skeleton className="mt-1 h-7 w-12" />
              ) : (
                <p className={cn("text-xl font-bold tabular-nums", className)}>
                  {stats ? statValue(stats, key, includeError) : "—"}
                </p>
              )}
            </div>
            <Icon className={cn("size-5 shrink-0 opacity-60", className)} />
          </CardContent>
        </Card>
      ))}
      <Card size="sm">
        <CardContent className="flex items-center justify-between gap-2 p-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-[11px] font-medium">Tasa de éxito</p>
            {loading && !stats ? (
              <Skeleton className="mt-1 h-7 w-14" />
            ) : (
              <p className="text-xl font-bold tabular-nums text-violet-600">
                {stats ? `${stats.success_rate}%` : "—"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
