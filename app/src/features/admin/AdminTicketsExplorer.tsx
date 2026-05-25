import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { adminFetch } from "@/lib/admin-fetch"
import { formatDateTime, getPurchaseStatusClass, getStatusLabel } from "@/lib/format"

type PurchaseRow = {
  id: number
  customer_name: string
  customer_phone: string
  raffle_name: string
  ticket_quantity: number
  status: string
  created_at: string
  ticket_numbers?: string
}

export function AdminTicketsExplorer() {
  const [search, setSearch] = useState("")

  const purchasesQuery = useQuery({
    queryKey: ["admin", "tickets", search],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100", page: "1", status: "approved" })
      if (search.trim()) {
        params.set("search", search.trim())
        params.set("search_type", "ticket")
      }
      return adminFetch<{ data: PurchaseRow[] }>(`/api/admin/purchases/?${params}`)
    },
  })

  const purchases = purchasesQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Boletos vendidos</h1>
        <p className="text-muted-foreground text-sm">
          Compras aprobadas con números de boleto asignados
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Explorador</CardTitle>
          <Input
            placeholder="Buscar por número de boleto…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="py-2 pr-3">Boletos</th>
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Rifa</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} className="border-b last:border-0">
                  <td className="py-3 pr-3 font-mono text-xs">
                    {purchase.ticket_numbers || "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <p className="font-medium">{purchase.customer_name}</p>
                    <p className="text-muted-foreground text-xs">{purchase.customer_phone}</p>
                  </td>
                  <td className="py-3 pr-3">{purchase.raffle_name}</td>
                  <td className="py-3 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPurchaseStatusClass(purchase.status)}`}
                    >
                      {getStatusLabel(purchase.status)}
                    </span>
                  </td>
                  <td className="py-3">{formatDateTime(purchase.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {purchases.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No hay boletos para mostrar con este filtro.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
