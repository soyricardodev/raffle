import {
  ArrowsCounterClockwiseIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react"
import type { ReactNode } from "react"
import { useState } from "react"
import { TransformComponent, TransformWrapper, useControls } from "react-zoom-pan-pinch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PaymentProofZoomViewerProps = {
  url: string
  alt: string
  className?: string
  initialScale?: number
  fillHeight?: boolean
  /** Extra actions rendered left of zoom controls (e.g. Abrir en pestaña). */
  headerActions?: ReactNode
}

function ZoomToolbar({ scalePercent }: { scalePercent: number }) {
  const { zoomIn, zoomOut, resetTransform } = useControls()

  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground min-w-11 text-right text-xs tabular-nums">
        {scalePercent}%
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="Alejar"
        onClick={() => zoomOut()}
      >
        <MagnifyingGlassMinusIcon />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="Acercar"
        onClick={() => zoomIn()}
      >
        <MagnifyingGlassPlusIcon />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="Restablecer zoom"
        onClick={() => resetTransform()}
      >
        <ArrowsCounterClockwiseIcon />
      </Button>
    </div>
  )
}

export function PaymentProofZoomViewer({
  url,
  alt,
  className,
  initialScale = 1,
  fillHeight = false,
  headerActions,
}: PaymentProofZoomViewerProps) {
  const [scalePercent, setScalePercent] = useState(Math.round(initialScale * 100))

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        fillHeight ? "h-full flex-1" : "flex-1",
        className,
      )}
    >
      <TransformWrapper
        initialScale={initialScale}
        minScale={0.5}
        maxScale={5}
        centerOnInit
        limitToBounds={false}
        wheel={{ step: 0.04 }}
        pinch={{ step: 3 }}
        doubleClick={{ mode: "toggle", step: 0.25 }}
        panning={{ velocityDisabled: true }}
        onTransform={(_ref, state) => {
          setScalePercent(Math.round(state.scale * 100))
        }}
      >
        <div className="bg-background flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-1">{headerActions}</div>
          <ZoomToolbar scalePercent={scalePercent} />
        </div>
        <div
          className={cn(
            "bg-muted/25 relative min-h-0 flex-1 overflow-hidden touch-none",
            fillHeight ? "rounded-none" : "min-h-[min(72vh,880px)] rounded-lg border lg:min-h-[min(78vh,960px)]",
          )}
        >
          <TransformComponent
            wrapperClass="!size-full"
            contentClass="!size-full !flex !h-full !items-center !justify-center !p-2"
          >
            <img
              src={url}
              alt={alt}
              draggable={false}
              className={cn(
                "select-none object-contain",
                fillHeight
                  ? "max-h-full max-w-full"
                  : "max-h-[min(90vh,1100px)] max-w-full",
              )}
            />
          </TransformComponent>
        </div>
      </TransformWrapper>
    </div>
  )
}
