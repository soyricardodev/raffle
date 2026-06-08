import { cn } from "@/lib/utils"

type PaymentReferenceValueProps = {
  reference: string
  size?: "sm" | "lg"
  className?: string
}

export function PaymentReferenceValue({
  reference,
  size = "sm",
  className,
}: PaymentReferenceValueProps) {
  const trimmed = reference.trim()
  if (!trimmed) return null

  return (
    <span
      className={cn(
        "font-mono font-bold break-all",
        size === "lg" ? "text-lg tabular-nums" : "text-sm",
        className,
      )}
    >
      {trimmed}
    </span>
  )
}

type PaymentReferenceBannerProps = {
  reference: string | null | undefined
  className?: string
}

export function PaymentReferenceBanner({ reference, className }: PaymentReferenceBannerProps) {
  const trimmed = reference?.trim()
  if (!trimmed) return null

  return (
    <div className={cn("shrink-0 border-b bg-background px-3 py-2.5", className)}>
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        Referencia de pago
      </p>
      <PaymentReferenceValue reference={trimmed} size="lg" />
    </div>
  )
}
