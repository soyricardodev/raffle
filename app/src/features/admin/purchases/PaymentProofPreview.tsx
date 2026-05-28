import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
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

export function PaymentProofPreview({ url, className, compact }: PaymentProofPreviewProps) {
  const image = isImageProof(url)
  const pdf = isPdfProof(url)

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="mb-2 flex shrink-0 justify-end">
        <Button variant="ghost" size="sm" className="h-8" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1 size-3.5" />
            Abrir
          </a>
        </Button>
      </div>

      {image ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-muted/30 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border"
        >
          <img
            src={url}
            alt="Comprobante de pago"
            className={cn(
              "w-full object-contain",
              compact ? "max-h-[min(50vh,360px)]" : "max-h-full",
            )}
            loading="lazy"
          />
        </a>
      ) : pdf ? (
        <iframe
          title="Comprobante PDF"
          src={url}
          className={cn(
            "bg-muted/30 w-full flex-1 rounded-lg border",
            compact ? "min-h-[200px]" : "min-h-0",
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
