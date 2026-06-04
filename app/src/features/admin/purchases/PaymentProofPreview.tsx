import { ArrowSquareOutIcon, MagnifyingGlassPlusIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
}

const LIGHTBOX_DIALOG_CLASS =
  "z-[70] flex h-[min(96vh,940px)] w-[min(96vw,40rem)] max-w-[min(96vw,40rem)] flex-col gap-2 p-3 sm:max-w-[min(96vw,40rem)] lg:w-[min(92vw,44rem)] lg:max-w-[min(92vw,44rem)]"

export function PaymentProofPreview({ url, className, compact }: PaymentProofPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const image = isImageProof(url)
  const pdf = isPdfProof(url)

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="mb-2 flex shrink-0 justify-end gap-1">
        {image ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setLightboxOpen(true)}
          >
            <MagnifyingGlassPlusIcon data-icon="inline-start" />
            Ampliar
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" className="h-8" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ArrowSquareOutIcon data-icon="inline-start" />
            Abrir en pestaña
          </a>
        </Button>
      </div>

      {image ? (
        <>
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="bg-muted/30 group relative flex min-h-0 flex-1 cursor-zoom-in items-center justify-center overflow-hidden rounded-lg border focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
            aria-label="Ampliar comprobante de pago"
          >
            <img
              src={url}
              alt="Comprobante de pago"
              className={cn(
                "max-h-[min(72vh,640px)] w-full object-contain",
                compact ? "max-h-[min(50vh,360px)]" : "",
              )}
              loading="lazy"
            />
            <span className="bg-background/80 text-foreground pointer-events-none absolute right-2 bottom-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <MagnifyingGlassPlusIcon className="size-3.5" aria-hidden />
              Ver en grande
            </span>
          </button>

          <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
            <DialogContent
              className={LIGHTBOX_DIALOG_CLASS}
              overlayClassName="z-[70]"
              showCloseButton
            >
              <DialogHeader className="shrink-0 gap-0.5 pr-10">
                <DialogTitle className="text-base">Comprobante de pago</DialogTitle>
                <DialogDescription className="sr-only">
                  Vista ampliada del comprobante con zoom y desplazamiento
                </DialogDescription>
              </DialogHeader>

              {lightboxOpen ? (
                <PaymentProofZoomViewer
                  key={url}
                  url={url}
                  alt="Comprobante de pago ampliado"
                  className="min-h-0 flex-1"
                />
              ) : null}

              <div className="flex shrink-0 justify-end pt-1">
                <Button variant="outline" size="sm" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ArrowSquareOutIcon data-icon="inline-start" />
                    Abrir en pestaña
                  </a>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : pdf ? (
        <iframe
          title="Comprobante PDF"
          src={url}
          className={cn(
            "bg-muted/30 w-full flex-1 rounded-lg border",
            compact ? "min-h-[200px]" : "min-h-[min(50vh,420px)]",
          )}
        />
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm underline"
        >
          Ver comprobante
        </a>
      )}
    </div>
  )
}
