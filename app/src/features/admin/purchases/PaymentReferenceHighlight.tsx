import { formatCurrencyForMethod } from "@/lib/format"
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

type PurchaseProofSummaryBannerProps = {
  reference?: string | null
  payerName?: string | null
  totalAmount: number | string
  paymentMethod: string
  className?: string
}

/** Referencia y monto arriba del comprobante para validación rápida. */
export function PurchaseProofSummaryBanner({
  reference,
  payerName,
  totalAmount,
  paymentMethod,
  className,
}: PurchaseProofSummaryBannerProps) {
  const trimmedReference = reference?.trim()
  const trimmedPayerName = payerName?.trim()

  return (
    <div
      className={cn(
        "shrink-0 border-b bg-background/95 px-3 py-2.5 backdrop-blur-sm",
        className,
      )}
    >
      <div className="grid grid-cols-2 items-end gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Referencia
          </p>
          {trimmedReference ? (
            <PaymentReferenceValue reference={trimmedReference} size="lg" />
          ) : (
            <p className="text-muted-foreground text-sm">Sin referencia</p>
          )}
        </div>
        <div className="min-w-0 text-right">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Total pagado
          </p>
          <p className="text-lg font-bold leading-tight text-emerald-800 tabular-nums dark:text-emerald-200">
            {formatCurrencyForMethod(totalAmount, paymentMethod)}
          </p>
        </div>
        {trimmedPayerName ? (
          <div className="col-span-2 min-w-0">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
              Nombre de quien paga
            </p>
            <p className="text-sm font-semibold break-words">{trimmedPayerName}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
