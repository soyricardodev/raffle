import type { FullAnalyticsReport } from "@/server/analytics.service"
import type { AnalyticsPeriodState } from "@raffle/shared/analytics"
export type { AnalyticsPeriodState }

export type AnalyticsResponse = FullAnalyticsReport

export {
  explorePurchasesSearchParams,
  periodLabel,
  periodStateToSearchParams as periodToSearchParams,
} from "@raffle/shared/analytics"

const FUNNEL_LABELS: Record<string, string> = {
  purchase_success_open: "Abrió confirmación",
  whatsapp_cta_click: "Clic WhatsApp",
  telegram_cta_click: "Clic Telegram",
  instagram_cta_click: "Clic Instagram",
  tickets_expand: "Expandió boletos",
  tickets_collapse: "Colapsó boletos",
  copy_tickets: "Copió boletos",
}

export function funnelEventLabel(event: string): string {
  return FUNNEL_LABELS[event] ?? event
}

export function exportAnalyticsCsv(data: AnalyticsResponse, periodLabelText: string) {
  const lines: string[] = [
    `Período,${periodLabelText}`,
    `Ingresos aprobados,${data.totalRevenue}`,
    `Ventas totales,${data.summary.totalSales}`,
    `Tasa aprobación,${(data.summary.approvalRate * 100).toFixed(1)}%`,
    `Clientes únicos,${data.summary.uniqueCustomers}`,
    `Ticket promedio,${data.summary.avgTicketsPerPurchase.toFixed(2)}`,
    "",
    "Fecha,Ventas,Ingresos",
    ...data.salesOverTime.map((row) => `${row.date},${row.count},${row.revenue}`),
    "",
    "Método,Ventas,Ingresos",
    ...data.revenueByMethod.map((row) => `${row.method},${row.count},${row.revenue}`),
    "",
    "Estado compra,Cantidad",
    ...data.statusDistribution.map((row) => `${row.status},${row.count}`),
    "",
    "Estado VE / ubicación,Ventas,Ingresos",
    ...data.locationByState.map((row) => `${row.label},${row.count},${row.revenue}`),
    "",
    "Mix geográfico,Ventas,Ingresos",
    ...data.locationMix.map((row) => `${row.label},${row.count},${row.revenue}`),
    "",
    "Día semana,Ventas,Ingresos",
    ...data.salesByWeekday.map((row) => `${row.weekday},${row.count},${row.revenue}`),
    "",
    "Hora,Ventas,Ingresos",
    ...data.salesByHour.map((row) => `${row.hour},${row.count},${row.revenue}`),
    "",
    "Moneda,Ventas,Ingresos",
    ...data.currencySplit.map((row) => `${row.currency},${row.count},${row.revenue}`),
  ]

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `analytics-${periodLabelText.replace(/\s+/g, "-")}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
