import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Bell,
  Calendar,
  CreditCard,
  LayoutDashboard,
  Mail,
  Plus,
  Receipt,
  Settings,
  Ticket,
  Users,
} from "lucide-react"
import type { Permission } from "@/lib/workforce-policy"

export type AdminNavItem = {
  name: string
  shortName: string
  href: string
  icon: LucideIcon
  description: string
  permission: Permission
}

export const ADMIN_ACCOUNT_PAGE_TITLE = "Mi cuenta"

export const adminNavItems = [
  {
    name: "Dashboard",
    shortName: "Inicio",
    href: "/admin",
    permission: "dashboard.read",
    icon: LayoutDashboard,
    description: "Resumen general",
  },
  {
    name: "Mis Rifas",
    shortName: "Rifas",
    href: "/admin/rifas",
    permission: "raffles.read",
    icon: Calendar,
    description: "Gestionar rifas",
  },
  {
    name: "Compras",
    shortName: "Compras",
    href: "/admin/compras",
    permission: "purchases.read",
    icon: Receipt,
    description: "Ventas y aprobaciones",
  },
  {
    name: "Análisis",
    shortName: "Stats",
    href: "/admin/analytics",
    permission: "analytics.read",
    icon: BarChart3,
    description: "Estadísticas",
  },
  {
    name: "Buscar boleto",
    shortName: "Boleto",
    href: "/admin/boletos",
    permission: "purchases.read",
    icon: Ticket,
    description: "Dueño por número",
  },
  {
    name: "Métodos de pago",
    shortName: "Pagos",
    href: "/admin/metodos-pago",
    permission: "payments.read",
    icon: CreditCard,
    description: "Cuentas globales",
  },
  {
    name: "Nueva Rifa",
    shortName: "Nueva",
    href: "/admin/crear",
    permission: "raffles.create",
    icon: Plus,
    description: "Crear rifa",
  },
  {
    name: "Configuración",
    shortName: "Config",
    href: "/admin/config",
    permission: "settings.read",
    icon: Settings,
    description: "Sitio y email",
  },
  {
    name: "Emails",
    shortName: "Emails",
    href: "/admin/emails",
    permission: "emails.read",
    icon: Mail,
    description: "Logs y pruebas",
  },
  {
    name: "Equipo",
    shortName: "Equipo",
    href: "/admin/equipo",
    icon: Users,
    description: "Personas y actividad",
    permission: "workforce.read",
  },
  {
    name: "Avisos",
    shortName: "Avisos",
    href: "/admin/avisos",
    permission: "push.read",
    icon: Bell,
    description: "Push a teléfonos",
  },
] satisfies Array<AdminNavItem>

/** Shared by the sidebar and the route guard; hiding a link is not authorization. */
export function permissionForAdminPage(pathname: string): Permission | null {
  if (pathname === "/admin/cuenta") return null
  if (pathname.startsWith("/admin/edit/")) return "raffles.edit"
  return adminNavItems.find((item) => isAdminNavActive(pathname, item.href))?.permission ?? null
}

export function firstAccessibleAdminPage(permissions: readonly string[]) {
  return (
    adminNavItems.find((item) => permissions.includes(item.permission))?.href ?? "/admin/cuenta"
  )
}

export function isAdminNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function adminNavTitle(href: string): string {
  const item = adminNavItems.find((entry) => entry.href === href)
  if (!item) throw new Error(`Unknown admin nav href: ${href}`)
  return item.name
}
