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
import { publicFetch } from "@/lib/admin-fetch"
import { formatCurrency } from "@/lib/format"
import { isDollarMethod, type PaymentMethod } from "@raffle/shared/validators"
import { CheckCircle2, Copy, Minus, Plus } from "lucide-react"

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
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [successResult, setSuccessResult] = useState<PurchaseResult | null>(null)

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

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!paymentMethod) throw new Error("Selecciona un método de pago")

      return publicFetch<PurchaseResult>("/api/purchases/", {
        method: "POST",
        body: JSON.stringify({
          raffleId: Number(raffle.id),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          customerCi: customerCi.trim(),
          paymentMethod,
          paymentReference: paymentReference.trim(),
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
      setPaymentReference("")
      setPaymentMethod("")
      setQuantity(minPurchase)
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
        </CardContent>
      </Card>
    )
  }

  async function copyTickets() {
    if (!successResult) return
    await navigator.clipboard.writeText(successResult.ticketNumbers.join(", "))
    toast.success("Boletos copiados")
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Comprar boletos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cantidad</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={quantity <= minPurchase || disabled}
                onClick={() => setQuantity((value) => Math.max(minPurchase, value - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="min-w-8 text-center text-lg font-semibold">{quantity}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={quantity >= effectiveMax || disabled}
                onClick={() => setQuantity((value) => Math.min(effectiveMax, value + 1))}
              >
                <Plus className="size-4" />
              </Button>
              <span className="text-muted-foreground text-sm">
                {available} disponibles · mín {minPurchase} / máx {effectiveMax}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Nombre completo</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Teléfono</Label>
              <Input
                id="customer-phone"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-ci">Cédula</Label>
              <Input
                id="customer-ci"
                value={customerCi}
                onChange={(event) => setCustomerCi(event.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {methods.map((method) => (
                <button
                  key={method.method_type}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPaymentMethod(method.method_type)}
                  className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                    paymentMethod === method.method_type
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="font-medium uppercase">
                    {method.method_type.replace(/_/g, " ")}
                  </span>
                </button>
              ))}
            </div>
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
            <Label htmlFor="payment-reference">Referencia de pago</Label>
            <Input
              id="payment-reference"
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              disabled={disabled}
              placeholder="Número de referencia o comprobante"
            />
          </div>

          {paymentMethod && (
            <div className="bg-primary/5 flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="text-muted-foreground text-sm">Total a pagar</span>
              <span className="text-lg font-bold">
                {formatCurrency(total, isDollarMethod(paymentMethod) ? "USD" : "Bs")}
              </span>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={
              disabled ||
              !customerName.trim() ||
              !customerPhone.trim() ||
              !paymentReference.trim() ||
              !paymentMethod
            }
            onClick={() => purchaseMutation.mutate()}
          >
            {purchaseMutation.isPending ? "Procesando…" : "Confirmar compra"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={successResult != null} onOpenChange={(open) => !open && setSuccessResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-500" />
              Compra registrada
            </DialogTitle>
            <DialogDescription>
              Tus boletos quedaron reservados. Guarda estos números y verifica tu compra cuando sea
              aprobada.
            </DialogDescription>
          </DialogHeader>
          {successResult && (
            <div className="bg-muted rounded-xl p-4">
              <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">
                Boletos #{successResult.purchaseId}
              </p>
              <p className="font-mono text-sm leading-relaxed">
                {successResult.ticketNumbers.join(" · ")}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => void copyTickets()}>
              <Copy className="mr-2 size-4" />
              Copiar boletos
            </Button>
            <Button onClick={() => setSuccessResult(null)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
