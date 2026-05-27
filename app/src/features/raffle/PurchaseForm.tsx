import { useMutation } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { publicFetch } from "@/lib/admin-fetch"
import { formatCurrency } from "@/lib/format"
import { isDollarMethod, type PaymentMethod } from "@raffle/shared/validators"
import { Copy, Loader2, Minus, PartyPopper, Plus } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

type PaymentMethodRow = {
  method_type: PaymentMethod
  account_info: Record<string, string> | string
  min_tickets?: number | null
  is_active?: boolean
}

type RaffleForPurchase = {
  id: number | string
  name: string
  status: string
  price_bs: number | string
  price_usd: number | string
  min_purchase: number | string
  max_purchase: number | string
  tickets_available: number | string
  payment_methods?: PaymentMethodRow[]
}

type PurchaseFormProps = {
  raffle: RaffleForPurchase
}

type PurchaseResult = {
  purchaseId: number
  ticketNumbers: string[]
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pago_movil: "Pago móvil",
  zinli: "Zinli",
  zelle: "Zelle",
  binance: "Binance",
  bs: "Bolívares",
  usd: "Dólares",
}

function parseAccountInfo(info: Record<string, string> | string) {
  if (typeof info === "string") {
    try {
      return JSON.parse(info) as Record<string, string>
    } catch {
      return {}
    }
  }
  return info
}

function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-primary/15 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
        {step}
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  )
}

function FieldHint({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-destructive text-xs">{message}</p>
}

export function PurchaseForm({ raffle }: PurchaseFormProps) {
  const minPurchase = Number(raffle.min_purchase) || 1
  const maxPurchase = Number(raffle.max_purchase) || 10
  const available = Number(raffle.tickets_available) || 0
  const effectiveMax = Math.min(maxPurchase, available)

  const [quantity, setQuantity] = useState(minPurchase)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerCi, setCustomerCi] = useState("")
  const [customerLocation, setCustomerLocation] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [successResult, setSuccessResult] = useState<PurchaseResult | null>(null)
  const [touched, setTouched] = useState(false)

  const methods = useMemo(() => {
    return (raffle.payment_methods ?? []).filter((method) => method.is_active !== false)
  }, [raffle.payment_methods])

  const selectedMethod = methods.find((method) => method.method_type === paymentMethod)
  const accountInfo = selectedMethod ? parseAccountInfo(selectedMethod.account_info) : null

  const total = useMemo(() => {
    if (!paymentMethod) return 0
    const unit = isDollarMethod(paymentMethod)
      ? Number(raffle.price_usd)
      : Number(raffle.price_bs)
    return unit * quantity
  }, [paymentMethod, quantity, raffle.price_bs, raffle.price_usd])

  const hints = useMemo(() => {
    if (!touched) return {}
    return {
      name: !customerName.trim() ? "Ingresa tu nombre completo" : undefined,
      phone: !customerPhone.trim() ? "Ingresa tu teléfono" : undefined,
      reference: !paymentReference.trim() ? "Ingresa la referencia de pago" : undefined,
      method: !paymentMethod ? "Elige un método de pago" : undefined,
    }
  }, [touched, customerName, customerPhone, paymentReference, paymentMethod])

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!paymentMethod) throw new Error("Selecciona un método de pago")

      const base = {
        raffleId: String(raffle.id),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        customerCi: customerCi.trim(),
        customerLocation: customerLocation.trim(),
        paymentMethod,
        paymentReference: paymentReference.trim(),
        ticketQuantity: String(quantity),
      }

      if (paymentProof) {
        const form = new FormData()
        for (const [key, value] of Object.entries(base)) {
          if (value) form.append(key, value)
        }
        form.append("paymentProof", paymentProof)
        return publicFetch<PurchaseResult>("/api/purchases/", { method: "POST", body: form })
      }

      return publicFetch<PurchaseResult>("/api/purchases/", {
        method: "POST",
        body: JSON.stringify({
          raffleId: Number(raffle.id),
          customerName: base.customerName,
          customerPhone: base.customerPhone,
          customerEmail: base.customerEmail || undefined,
          customerCi: base.customerCi || undefined,
          customerLocation: base.customerLocation || null,
          paymentMethod,
          paymentReference: base.paymentReference,
          ticketQuantity: quantity,
        }),
      })
    },
    onSuccess: (result) => {
      setSuccessResult(result)
      setCustomerName("")
      setCustomerPhone("")
      setCustomerEmail("")
      setCustomerCi("")
      setCustomerLocation("")
      setPaymentReference("")
      setPaymentMethod("")
      setPaymentProof(null)
      setQuantity(minPurchase)
      setTouched(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const disabled =
    raffle.status !== "active" ||
    available <= 0 ||
    purchaseMutation.isPending ||
    effectiveMax < minPurchase

  if (raffle.status === "paused") {
    return null
  }

  if (raffle.status === "finished") {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="font-medium">Esta rifa ya finalizó</p>
          <p className="text-muted-foreground mt-1 text-sm">Gracias por participar.</p>
        </CardContent>
      </Card>
    )
  }

  async function copyTickets() {
    if (!successResult) return
    await navigator.clipboard.writeText(successResult.ticketNumbers.join(", "))
    toast.success("Boletos copiados al portapapeles")
  }

  function handleSubmit() {
    setTouched(true)
    if (hints.name || hints.phone || hints.reference || hints.method) return
    purchaseMutation.mutate()
  }

  const isSubmitting = purchaseMutation.isPending

  return (
    <>
      <Card className="relative overflow-hidden">
        {isSubmitting && (
          <div className="bg-background/80 absolute inset-0 z-10 flex flex-col gap-3 p-6 backdrop-blur-sm">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Registrando tu compra…
            </p>
          </div>
        )}
        <CardHeader>
          <CardTitle>Comprar boletos</CardTitle>
          <p className="text-muted-foreground text-sm">
            Completa los pasos. Te mostraremos tus números al finalizar.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <SectionHeader step={1} title="Cantidad de boletos" />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                disabled={quantity <= minPurchase || disabled}
                onClick={() => setQuantity((value) => Math.max(minPurchase, value - 1))}
                aria-label="Menos boletos"
              >
                <Minus className="size-4" />
              </Button>
              <span className="min-w-10 text-center text-2xl font-bold tabular-nums">{quantity}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                disabled={quantity >= effectiveMax || disabled}
                onClick={() => setQuantity((value) => Math.min(effectiveMax, value + 1))}
                aria-label="Más boletos"
              >
                <Plus className="size-4" />
              </Button>
              <p className="text-muted-foreground ml-auto text-right text-xs leading-snug">
                <span className="text-foreground font-medium">{available}</span> disponibles
                <br />
                mín {minPurchase} · máx {effectiveMax}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader step={2} title="Tus datos" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Nombre completo *</Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  disabled={disabled}
                  aria-invalid={!!hints.name}
                  className="min-h-11"
                  autoComplete="name"
                />
                <FieldHint message={hints.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Teléfono *</Label>
                <Input
                  id="customer-phone"
                  type="tel"
                  inputMode="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  disabled={disabled}
                  aria-invalid={!!hints.phone}
                  className="min-h-11"
                  placeholder="04121234567"
                  autoComplete="tel"
                />
                <FieldHint message={hints.phone} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email (opcional)</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  disabled={disabled}
                  className="min-h-11"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-ci">Cédula (opcional)</Label>
                <Input
                  id="customer-ci"
                  value={customerCi}
                  onChange={(event) => setCustomerCi(event.target.value)}
                  disabled={disabled}
                  className="min-h-11"
                  placeholder="V12345678"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customer-location">Ubicación (opcional)</Label>
                <Input
                  id="customer-location"
                  value={customerLocation}
                  onChange={(event) => setCustomerLocation(event.target.value)}
                  disabled={disabled}
                  className="min-h-11"
                  placeholder="Ciudad o estado"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader step={3} title="Pago" />
            <div className="space-y-2">
              <Label>Método de pago *</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {methods.map((method) => {
                  const active = paymentMethod === method.method_type
                  return (
                    <button
                      key={method.method_type}
                      type="button"
                      data-testid={`payment-method-${method.method_type}`}
                      aria-pressed={active}
                      disabled={disabled}
                      onClick={() => setPaymentMethod(method.method_type)}
                      className={cn(
                        "min-h-11 rounded-xl border p-3 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
                        active
                          ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <span className="font-medium">
                        {PAYMENT_LABELS[method.method_type] ?? method.method_type}
                      </span>
                    </button>
                  )
                })}
              </div>
              <FieldHint message={hints.method} />
            </div>

            {accountInfo && Object.keys(accountInfo).length > 0 && (
              <div className="bg-muted/40 space-y-1 rounded-xl border p-3 text-sm">
                <p className="font-medium">Datos para pagar</p>
                {Object.entries(accountInfo).map(([key, value]) => (
                  <p key={key} className="text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}: <span className="text-foreground">{value}</span>
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="payment-reference">Referencia de pago *</Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                disabled={disabled}
                aria-invalid={!!hints.reference}
                className="min-h-11"
                placeholder="Últimos dígitos o número de referencia"
              />
              <FieldHint message={hints.reference} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-proof">Comprobante (opcional)</Label>
              <Input
                id="payment-proof"
                type="file"
                accept="image/*,application/pdf"
                disabled={disabled}
                className="min-h-11 file:mr-3"
                onChange={(event) => setPaymentProof(event.target.files?.[0] ?? null)}
              />
            </div>

            {paymentMethod && (
              <div className="bg-primary/5 flex items-center justify-between rounded-xl border border-primary/20 px-4 py-3">
                <span className="text-muted-foreground text-sm">Total a pagar</span>
                <span className="text-xl font-bold tabular-nums">
                  {formatCurrency(total, isDollarMethod(paymentMethod) ? "USD" : "Bs")}
                </span>
              </div>
            )}
          </section>

          <Button
            className="min-h-12 w-full text-base"
            size="lg"
            data-testid="purchase-submit"
            disabled={disabled || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Procesando…
              </>
            ) : (
              "Confirmar compra"
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={successResult != null} onOpenChange={(open) => !open && setSuccessResult(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center sm:text-center">
            <div className="bg-emerald-500/15 mx-auto mb-2 flex size-14 items-center justify-center rounded-full">
              <PartyPopper className="size-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <DialogTitle className="text-xl">¡Listo, compra registrada!</DialogTitle>
            <DialogDescription>
              Tus boletos quedaron reservados. Guárdalos y verifica el estado cuando sea aprobada.
            </DialogDescription>
          </DialogHeader>
          {successResult && (
            <div className="space-y-3">
              <div className="from-primary/10 to-primary/5 rounded-xl border bg-gradient-to-br p-4">
                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                  Compra #{successResult.purchaseId}
                </p>
                <p className="font-mono text-base leading-relaxed font-semibold">
                  {successResult.ticketNumbers.join(" · ")}
                </p>
              </div>
              <p className="text-muted-foreground text-center text-xs">
                {successResult.ticketNumbers.length} boleto
                {successResult.ticketNumbers.length === 1 ? "" : "s"} asignado
                {successResult.ticketNumbers.length === 1 ? "" : "s"}
              </p>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="min-h-11 w-full" onClick={() => void copyTickets()}>
              <Copy className="mr-2 size-4" />
              Copiar números de boletos
            </Button>
            <Button variant="outline" className="min-h-11 w-full" asChild>
              <Link to="/verificar">Verificar mis boletos</Link>
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setSuccessResult(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
