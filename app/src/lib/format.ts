import { isDollarMethod, type PaymentMethod } from "@raffle/shared/validators"

export function formatCurrency(amount: number | string, currency: "Bs" | "USD" = "Bs") {
  const value = Number(amount)
  if (Number.isNaN(value)) return "—"
  if (currency === "USD") return `$ ${value.toFixed(2)}`
  return `Bs ${value.toFixed(2)}`
}

export function formatCurrencyForMethod(amount: number | string, paymentMethod: string): string {
  const currency = isDollarMethod(paymentMethod as PaymentMethod) ? "USD" : "Bs"
  return formatCurrency(amount, currency)
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleString("es-VE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  draft: "Borrador",
  active: "Activa",
  paused: "Pausada",
  finished: "Finalizada",
  cancelled: "Cancelada",
  sold: "Vendido",
  reserved: "Reservado",
  available: "Disponible",
}

export function getStatusLabel(status: string) {
  return statusLabels[status] ?? status
}

export function getPurchaseStatusClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function getRaffleStatusClass(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
    case "paused":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
    case "finished":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
    case "draft":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
    default:
      return "bg-muted text-muted-foreground"
  }
}
