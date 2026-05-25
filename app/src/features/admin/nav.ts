import type { LucideIcon } from "lucide-react"
import { BarChart3, Calendar, LayoutDashboard, Mail, Plus, Settings, Ticket } from "lucide-react"

export type AdminNavItem = {
  name: string
  href: string
  icon: LucideIcon
  description: string
}

export const adminNavItems: AdminNavItem[] = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Resumen general",
  },
  {
    name: "Mis Rifas",
    href: "/admin/rifas",
    icon: Calendar,
    description: "Gestionar rifas",
  },
  {
    name: "Análisis",
    href: "/admin/analytics",
    icon: BarChart3,
    description: "Estadísticas",
  },
  {
    name: "Boletos",
    href: "/admin/boletos",
    icon: Ticket,
    description: "Boletos vendidos",
  },
  {
    name: "Nueva Rifa",
    href: "/admin/crear",
    icon: Plus,
    description: "Crear rifa",
  },
  {
    name: "Configuración",
    href: "/admin/config",
    icon: Settings,
    description: "Sitio y email",
  },
  {
    name: "Emails",
    href: "/admin/emails",
    icon: Mail,
    description: "Logs y pruebas",
  },
]
