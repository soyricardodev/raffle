import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminFetch } from "@/lib/admin-fetch"
import { formatCurrency } from "@/lib/format"

type DashboardStats = {
  raffles: Record<string, number>
  tickets: Record<string, number>
  sales: Record<string, number>
  users: Record<string, number>
}

export function AdminAnalytics() {
  const statsQuery = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => adminFetch<DashboardStats>("/api/admin/dashboard"),
  })

  const stats = statsQuery.data

  const sections = [
    {
      title: "Rifas",
      items: [
        { label: "Total", value: stats?.raffles.total_raffles ?? 0 },
        { label: "Activas", value: stats?.raffles.active_raffles ?? 0 },
        { label: "Finalizadas", value: stats?.raffles.finished_raffles ?? 0 },
      ],
    },
    {
      title: "Boletos (rifa activa)",
      items: [
        { label: "Total", value: stats?.tickets.total_tickets ?? 0 },
        { label: "Vendidos", value: stats?.tickets.sold_tickets ?? 0 },
        { label: "Reservados", value: stats?.tickets.reserved_tickets ?? 0 },
      ],
    },
    {
      title: "Ventas",
      items: [
        { label: "Total", value: stats?.sales.total_sales ?? 0 },
        { label: "Pendientes", value: stats?.sales.pending_sales ?? 0 },
        { label: "Aprobadas", value: stats?.sales.approved_sales ?? 0 },
        { label: "Ingresos", value: formatCurrency(stats?.sales.total_revenue ?? 0) },
      ],
    },
    {
      title: "Clientes",
      items: [
        { label: "Total", value: stats?.users.total_customers ?? 0 },
        { label: "Nuevos (30d)", value: stats?.users.new_customers ?? 0 },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Análisis</h1>
        <p className="text-muted-foreground text-sm">Métricas consolidadas del sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
