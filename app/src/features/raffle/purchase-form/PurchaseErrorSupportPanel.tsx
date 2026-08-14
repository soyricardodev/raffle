import { ArrowClockwiseIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import type { PurchaseSupportErrorState } from "@/features/raffle/purchase-form/purchase-error-support"

type PurchaseErrorSupportPanelProps = {
  support: PurchaseSupportErrorState
  supportHref: string | null
  supportLabel: string
  supportBrandColor: string
  supportIconSrc: string
  onRetry: () => void
  isRetrying?: boolean
}

export function PurchaseErrorSupportPanel({
  support,
  supportHref,
  supportLabel,
  supportBrandColor,
  supportIconSrc,
  onRetry,
  isRetrying = false,
}: PurchaseErrorSupportPanelProps) {
  return (
    <div
      className="border-destructive/30 bg-destructive/5 flex flex-col gap-3 rounded-lg border p-3"
      role="alert"
      aria-live="polite"
    >
      <div className="space-y-1">
        <p className="text-destructive text-sm font-medium">{support.message}</p>
        <p className="text-muted-foreground text-xs">
          Código de soporte:{" "}
          <span className="font-mono text-foreground">{support.traceId}</span>
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {support.retryable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10"
            disabled={isRetrying}
            onClick={onRetry}
          >
            <ArrowClockwiseIcon data-icon="inline-start" className={isRetrying ? "animate-spin" : ""} />
            Reintentar
          </Button>
        ) : null}
        {supportHref ? (
          <Button
            type="button"
            size="sm"
            className="min-h-10 text-white"
            style={{ backgroundColor: supportBrandColor }}
            asChild
          >
            <a href={supportHref} target="_blank" rel="noopener noreferrer">
              <img src={supportIconSrc} alt="" className="size-5" width={20} height={20} />
              Contactar soporte por {supportLabel}
            </a>
          </Button>
        ) : null}
      </div>
      {!supportHref ? (
        <p className="text-muted-foreground text-xs">
          Guarda el código de soporte y contáctanos por los canales oficiales del sitio.
        </p>
      ) : null}
    </div>
  )
}
