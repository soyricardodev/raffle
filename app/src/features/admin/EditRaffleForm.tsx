import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adminFetch } from "@/lib/admin-fetch"
import { PaymentMethod, type UpdateRaffleInput } from "@raffle/shared/validators"
import { Plus, Trash2 } from "lucide-react"

type PrizeDraft = { name: string; description: string; position: number }
type MethodDraft = { method_type: string; account_info: Record<string, string> }

type RaffleDetail = {
  id: number
  name: string
  description: string | null
  total_tickets: number
  price_bs: string
  price_usd: string
  min_purchase: number
  max_purchase: number
  draw_date: string | null
  status: string
  prizes?: { name: string; description: string | null; position: number }[]
  payment_methods?: {
    method_type: string
    account_info: string | Record<string, string>
    is_active?: boolean
  }[]
}

const defaultPrize = (): PrizeDraft => ({ name: "", description: "", position: 1 })
const defaultMethod = (): MethodDraft => ({
  method_type: "pago_movil",
  account_info: { banco: "", telefono: "", cedula: "" },
})

function parseAccountInfo(info: string | Record<string, string>): Record<string, string> {
  if (typeof info === "string") {
    try {
      return JSON.parse(info) as Record<string, string>
    } catch {
      return {}
    }
  }
  return info
}

export function EditRaffleForm({ raffleId }: { raffleId: string }) {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [priceBs, setPriceBs] = useState("")
  const [priceUsd, setPriceUsd] = useState("")
  const [minPurchase, setMinPurchase] = useState("1")
  const [maxPurchase, setMaxPurchase] = useState("10")
  const [drawDate, setDrawDate] = useState("")
  const [status, setStatus] = useState<string>("draft")
  const [prizes, setPrizes] = useState<PrizeDraft[]>([defaultPrize()])
  const [methods, setMethods] = useState<MethodDraft[]>([defaultMethod()])

  const raffleQuery = useQuery({
    queryKey: ["admin", "raffle", raffleId],
    queryFn: () => adminFetch<RaffleDetail>(`/api/admin/raffles/${raffleId}`),
  })

  useEffect(() => {
    const r = raffleQuery.data
    if (!r) return
    setName(r.name)
    setDescription(r.description ?? "")
    setPriceBs(String(r.price_bs))
    setPriceUsd(String(r.price_usd))
    setMinPurchase(String(r.min_purchase))
    setMaxPurchase(String(r.max_purchase))
    setStatus(r.status)
    if (r.draw_date) {
      const d = new Date(r.draw_date)
      setDrawDate(d.toISOString().slice(0, 16))
    }
    if (r.prizes?.length) {
      setPrizes(
        r.prizes.map((p) => ({
          name: p.name,
          description: p.description ?? "",
          position: p.position,
        })),
      )
    }
    if (r.payment_methods?.length) {
      setMethods(
        r.payment_methods.map((m) => ({
          method_type: m.method_type,
          account_info: parseAccountInfo(m.account_info),
        })),
      )
    }
  }, [raffleQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: UpdateRaffleInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        price_bs: Number(priceBs),
        price_usd: Number(priceUsd),
        min_purchase: Number(minPurchase),
        max_purchase: Number(maxPurchase),
        draw_date: drawDate ? new Date(drawDate).toISOString() : null,
        status: status as UpdateRaffleInput["status"],
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
      return adminFetch(`/api/admin/raffles/${raffleId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast.success("Rifa actualizada")
      void navigate({ to: "/admin/rifas" })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (raffleQuery.isLoading) {
    return <p className="text-muted-foreground animate-pulse p-8 text-center">Cargando rifa…</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 [&_input]:min-h-11 [&_select]:min-h-11 [&_textarea]:min-h-11">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Editar rifa</h1>
        <p className="text-muted-foreground text-sm">#{raffleId}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos principales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="edit-name">Nombre</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="edit-desc">Descripción</Label>
            <Input id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Precio Bs</Label>
            <Input type="number" value={priceBs} onChange={(e) => setPriceBs(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Precio USD</Label>
            <Input type="number" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Mín. compra</Label>
            <Input type="number" value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Máx. compra</Label>
            <Input type="number" value={maxPurchase} onChange={(e) => setMaxPurchase(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Sorteo</Label>
            <Input
              type="datetime-local"
              value={drawDate}
              onChange={(e) => setDrawDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="draft">Borrador</option>
              <option value="active">Activa</option>
              <option value="paused">Pausada</option>
              <option value="finished">Finalizada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Premios</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPrizes((items) => [...items, defaultPrize()])}
          >
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
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Métodos de pago</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMethods((items) => [...items, defaultMethod()])}
          >
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

      <div className="flex flex-wrap gap-2">
        <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          Guardar cambios
        </Button>
        <Button variant="outline" onClick={() => void navigate({ to: "/admin/rifas" })}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
