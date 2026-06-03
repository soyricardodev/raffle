import { WarningIcon } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import type { EmailLogStats, EmailProviderHealth } from "@/features/admin/emails/types"
import { PROVIDER_LABELS } from "@/features/admin/emails/email-labels"
import { cn } from "@/lib/utils"

type EmailProviderBannerProps = {
  health: EmailProviderHealth | undefined
  stats: EmailLogStats | undefined
  onFilterFailed?: () => void
}

function BannerBox({
  variant,
  title,
  children,
}: {
  variant: "destructive" | "warning"
  title: string
  children: import("react").ReactNode
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-4 text-sm",
        variant === "destructive"
          ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
          : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
      )}
    >
      <WarningIcon className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <div className="mt-1 text-[13px] opacity-90">{children}</div>
      </div>
    </div>
  )
}

export function EmailProviderBanner({ health, stats, onFilterFailed }: EmailProviderBannerProps) {
  if (!health && !stats?.failed_last_24h) return null

  const noopWarning = health?.is_noop
  const failedAlert = (stats?.failed_last_24h ?? 0) > 0

  if (!noopWarning && !failedAlert) return null

  return (
    <div className="flex flex-col gap-2">
      {noopWarning ? (
        <BannerBox variant="destructive" title="Correos en modo simulación">
          El proveedor activo es{" "}
          <strong>{PROVIDER_LABELS[health!.provider] ?? health!.provider}</strong>. Los registros
          pueden marcarse como enviados sin llegar al destinatario. Configura{" "}
          <code className="rounded bg-black/10 px-1 text-xs dark:bg-white/10">EMAIL_PROVIDER</code>{" "}
          (resend o brevo) en el servidor.
        </BannerBox>
      ) : null}
      {failedAlert ? (
        <BannerBox variant="warning" title="Envíos fallidos recientes">
          <span className="flex flex-wrap items-center gap-2">
            {stats!.failed_last_24h} correo{stats!.failed_last_24h === 1 ? "" : "s"} fallido
            {stats!.failed_last_24h === 1 ? "" : "s"} en las últimas 24 horas.
            {onFilterFailed ? (
              <Button type="button" variant="outline" size="sm" onClick={onFilterFailed}>
                Ver fallidos
              </Button>
            ) : (
              <Link
                to="/admin/emails"
                search={{ status: "failed" }}
                className="inline-flex h-8 items-center rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted"
              >
                Ver fallidos
              </Link>
            )}
          </span>
        </BannerBox>
      ) : null}
    </div>
  )
}
