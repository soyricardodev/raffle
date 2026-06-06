import {
  ArrowSquareOutIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PaymentProofZoomViewer } from "@/features/admin/purchases/PaymentProofZoomViewer"
import { cn } from "@/lib/utils"

function isImageProof(url: string) {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)
}

function isPdfProof(url: string) {
  return /\.pdf(\?|$)/i.test(url)
}

type PaymentProofPreviewProps = {
  url: string
  className?: string
  compact?: boolean
  defaultZoomed?: boolean
  fillHeight?: boolean
}

export function PaymentProofPreview({
  url,
  className,
  compact,
  defaultZoomed = true,
  fillHeight = false,
}: PaymentProofPreviewProps) {
  const [zoomed, setZoomed] = useState(defaultZoomed)
  const image = isImageProof(url)
  const pdf = isPdfProof(url)

  const headerActions = (
    <>
      {image ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setZoomed((current) => !current)}
        >
          {zoomed ? (
            <>
              <MagnifyingGlassMinusIcon data-icon="inline-start" />
              Reducir
            </>
          ) : (
            <>
              <MagnifyingGlassPlusIcon data-icon="inline-start" />
              Ampliar
            </>
          )}
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ArrowSquareOutIcon data-icon="inline-start" />
          Abrir en pestaña
        </a>
      </Button>
    </>
  )

  return (
    <div className={cn("flex min-h-0 flex-col", fillHeight ? "h-full flex-1" : "flex-1", className)}>
      {image ? (
        zoomed ? (
          <PaymentProofZoomViewer
            key={url}
            url={url}
            alt="Comprobante de pago ampliado"
            fillHeight={fillHeight}
            initialScale={1}
            headerActions={headerActions}
            className={fillHeight ? "min-h-0 flex-1" : "min-h-[min(72vh,880px)] flex-1 lg:min-h-0"}
          />
        ) : (
          <>
            <div className="bg-background flex shrink-0 flex-wrap items-center justify-end gap-1 border-b px-2 py-1.5">
              {headerActions}
            </div>
            <button
              type="button"
              onClick={() => setZoomed(true)}
              className={cn(
                "bg-muted/25 group relative flex min-h-0 flex-1 cursor-zoom-in items-center justify-center overflow-hidden focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                fillHeight ? "rounded-none" : "min-h-[min(72vh,880px)] rounded-lg border lg:min-h-0",
              )}
              aria-label="Ampliar comprobante de pago"
            >
              <img
                src={url}
                alt="Comprobante de pago"
                className={cn(
                  "max-w-full object-contain p-2",
                  fillHeight ? "max-h-full" : "max-h-[min(88vh,1100px)]",
                  compact ? "max-h-[min(60vh,720px)]" : "",
                )}
                loading="lazy"
              />
            </button>
          </>
        )
      ) : pdf ? (
        <>
          <div className="bg-background flex shrink-0 justify-end gap-1 border-b px-2 py-1.5">
            {headerActions}
          </div>
          <iframe
            title="Comprobante PDF"
            src={url}
            className={cn(
              "bg-muted/25 w-full flex-1 border-0",
              fillHeight ? "min-h-0" : "min-h-[min(60vh,520px)]",
              compact ? "min-h-[200px]" : "",
            )}
          />
        </>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary p-4 text-sm underline"
        >
          Ver comprobante
        </a>
      )}
    </div>
  )
}
