import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adminFetch } from "@/lib/admin-fetch"
import { PaymentMethod, type CreateRaffleInput } from "@raffle/shared/validators"
import { Plus, Trash2 } from "lucide-react"

type PrizeDraft = { name: string; description: string; position: number }
type MethodDraft = { method_type: string; account_info: Record<string, string> }

const defaultPrize = (): PrizeDraft => ({ name: "", description: "", position: 1 })
const defaultMethod = (): MethodDraft => ({
  method_type: "pago_movil",
  account_info: { banco: "", telefono: "", cedula: "" },
})

export function CreateRaffleForm() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [totalTickets, setTotalTickets] = useState("1000")
  const [priceBs, setPriceBs] = useState("50")
  const [priceUsd, setPriceUsd] = useState("5")
  const [minPurchase, setMinPurchase] = useState("1")
  const [maxPurchase, setMaxPurchase] = useState("10")
  const [drawDate, setDrawDate] = useState("")
  const [status, setStatus] = useState<CreateRaffleInput["status"]>("draft")
  const [prizes, setPrizes] = useState<PrizeDraft[]>([defaultPrize()])
  const [methods, setMethods] = useState<MethodDraft[]>([defaultMethod()])

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateRaffleInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        total_tickets: Number(totalTickets),
        price_bs: Number(priceBs),
        price_usd: Number(priceUsd),
        min_purchase: Number(minPurchase),
        max_purchase: Number(maxPurchase),
        draw_date: drawDate ? new Date(drawDate).toISOString() : null,
        status,
        auto_pause_enabled: true,
        prizes: prizes
          .filter((prize) => prize.name.trim())
          .map((prize, index) => ({
            name: prize.name.trim(),
            description: prize.description.trim() || undefined,
            position: prize.position || index + 1,
          })),
        payment_methods: methods.map((method) => ({
          method_type: PaymentMethod.parse(method.method_type),
          account_info: method.account_info,
          is_active: true,
        })),
      }

      return adminFetch<{ raffleId: number }>("/api/admin/raffles/", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (result) => {
      toast.success(`Rifa creada (#${result.raffleId})`)
      void navigate({ to: "/admin/rifas" })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Nueva rifa</h1>
        <p className="text-muted-foreground text-sm">Completa los datos básicos para publicar una rifa.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total-tickets">Total boletos</Label>
            <Input
              id="total-tickets"
              type="number"
              value={totalTickets}
              onChange={(event) => setTotalTickets(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Estado inicial</Label>
            <select
              id="status"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as CreateRaffleInput["status"])}
            >
              <option value="draft">Borrador</option>
              <option value="active">Activa</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price-bs">Precio Bs</Label>
            <Input id="price-bs" type="number" value={priceBs} onChange={(event) => setPriceBs(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price-usd">Precio USD</Label>
            <Input
              id="price-usd"
              type="number"
              value={priceUsd}
              onChange={(event) => setPriceUsd(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-purchase">Compra mínima</Label>
            <Input
              id="min-purchase"
              type="number"
              value={minPurchase}
              onChange={(event) => setMinPurchase(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-purchase">Compra máxima</Label>
            <Input
              id="max-purchase"
              type="number"
              value={maxPurchase}
              onChange={(event) => setMaxPurchase(event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="draw-date">Fecha de sorteo</Label>
            <Input
              id="draw-date"
              type="datetime-local"
              value={drawDate}
              onChange={(event) => setDrawDate(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Premios</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setPrizes((items) => [...items, defaultPrize()])}>
            <Plus className="mr-1 size-4" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {prizes.map((prize, index) => (
            <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                placeholder="Nombre del premio"
                value={prize.name}
                onChange={(event) =>
                  setPrizes((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, name: event.target.value } : item,
                    ),
                  )
                }
              />
              <Input
                placeholder="Descripción"
                value={prize.description}
                onChange={(event) =>
                  setPrizes((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, description: event.target.value } : item,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPrizes((items) => items.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Métodos de pago</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setMethods((items) => [...items, defaultMethod()])}>
            <Plus className="mr-1 size-4" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {methods.map((method, index) => (
            <div key={index} className="space-y-2 rounded-lg border p-3">
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={method.method_type}
                onChange={(event) =>
                  setMethods((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, method_type: event.target.value } : item,
                    ),
                  )
                }
              >
                {PaymentMethod.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Banco"
                  value={method.account_info.banco ?? ""}
                  onChange={(event) =>
                    setMethods((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              account_info: { ...item.account_info, banco: event.target.value },
                            }
                          : item,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="Teléfono"
                  value={method.account_info.telefono ?? ""}
                  onChange={(event) =>
                    setMethods((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              account_info: { ...item.account_info, telefono: event.target.value },
                            }
                          : item,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="Cédula"
                  value={method.account_info.cedula ?? ""}
                  onChange={(event) =>
                    setMethods((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              account_info: { ...item.account_info, cedula: event.target.value },
                            }
                          : item,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        className="w-full sm:w-auto"
        disabled={!name.trim() || createMutation.isPending}
        onClick={() => createMutation.mutate()}
      >
        {createMutation.isPending ? "Creando…" : "Crear rifa"}
      </Button>
    </div>
  )
}
