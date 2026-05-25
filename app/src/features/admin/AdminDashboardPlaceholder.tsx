import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const placeholders = [
  { title: "Rifas activas", value: "—" },
  { title: "Ventas pendientes", value: "—" },
  { title: "Boletos vendidos", value: "—" },
  { title: "Clientes", value: "—" },
]

export function AdminDashboardPlaceholder() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          KPIs y ventas recientes se conectarán cuando DeepSeek entregue T-112 / T-108.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {placeholders.map((item) => (
          <Card key={item.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
