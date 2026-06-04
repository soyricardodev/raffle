import {
  ArrowsCounterClockwiseIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react"
import { useState } from "react"
import { TransformComponent, TransformWrapper, useControls } from "react-zoom-pan-pinch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PaymentProofZoomViewerProps = {
  url: string
  alt: string
  className?: string
}

function ZoomToolbar({ scalePercent }: { scalePercent: number }) {
  const { zoomIn, zoomOut, resetTransform } = useControls()

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
      <p className="text-muted-foreground text-xs leading-snug">
        Rueda o pellizco para zoom · Arrastra para mover · Doble clic para alternar
      </p>
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
    </div>
  )
}

export function PaymentProofZoomViewer({ url, alt, className }: PaymentProofZoomViewerProps) {
  const [scalePercent, setScalePercent] = useState(100)

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2", className)}>
      <TransformWrapper
        initialScale={1}
        minScale={0.35}
        maxScale={8}
        centerOnInit
        limitToBounds={false}
        wheel={{ step: 0.12 }}
        pinch={{ step: 6 }}
        doubleClick={{ mode: "toggle", step: 0.7 }}
        panning={{ velocityDisabled: true }}
        onTransform={(_ref, state) => {
          setScalePercent(Math.round(state.scale * 100))
        }}
      >
        <ZoomToolbar scalePercent={scalePercent} />
        <div className="bg-muted/20 relative min-h-[min(78vh,820px)] flex-1 overflow-hidden rounded-lg border touch-none">
          <TransformComponent
            wrapperClass="!size-full"
            contentClass="!size-full !flex !items-center !justify-center"
          >
            <img
              src={url}
              alt={alt}
              draggable={false}
              className="max-h-[min(82vh,880px)] max-w-full select-none object-contain"
            />
          </TransformComponent>
        </div>
      </TransformWrapper>
    </div>
  )
}
