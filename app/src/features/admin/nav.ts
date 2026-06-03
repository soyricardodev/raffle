import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Calendar,
  CreditCard,
  LayoutDashboard,
  Mail,
  Plus,
  Receipt,
  Settings,
  Ticket,
} from "lucide-react"

export type AdminNavItem = {
  name: string
  shortName: string
  href: string
  icon: LucideIcon
  description: string
}

export const ADMIN_ACCOUNT_PAGE_TITLE = "Mi cuenta"

export const adminNavItems: Array<AdminNavItem> = [
  {
    name: "Dashboard",
    shortName: "Inicio",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Resumen general",
  },
  {
    name: "Mis Rifas",
    shortName: "Rifas",
    href: "/admin/rifas",
    icon: Calendar,
    description: "Gestionar rifas",
  },
  {
    name: "Compras",
    shortName: "Compras",
    href: "/admin/compras",
    icon: Receipt,
    description: "Ventas y aprobaciones",
  },
  {
    name: "Análisis",
    shortName: "Stats",
    href: "/admin/analytics",
    icon: BarChart3,
    description: "Estadísticas",
  },
  {
    name: "Buscar boleto",
    shortName: "Boleto",
    href: "/admin/boletos",
    icon: Ticket,
    description: "Dueño por número",
  },
  {
    name: "Métodos de pago",
    shortName: "Pagos",
    href: "/admin/metodos-pago",
    icon: CreditCard,
    description: "Cuentas globales",
  },
  {
    name: "Nueva Rifa",
    shortName: "Nueva",
    href: "/admin/crear",
    icon: Plus,
    description: "Crear rifa",
  },
  {
    name: "Configuración",
    shortName: "Config",
    href: "/admin/config",
    icon: Settings,
    description: "Sitio y email",
  },
  {
    name: "Emails",
    shortName: "Emails",
    href: "/admin/emails",
    icon: Mail,
    description: "Logs y pruebas",
  },
]

export function isAdminNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function adminNavTitle(href: string): string {
  const item = adminNavItems.find((entry) => entry.href === href)
  if (!item) throw new Error(`Unknown admin nav href: ${href}`)
  return item.name
}
