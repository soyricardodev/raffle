import type { IconProps } from "@phosphor-icons/react"
import {
  CheckCircle,
  FileDashed,
  Flag,
  Pause,
  Play,
  Prohibit,
  RocketLaunch,
} from "@phosphor-icons/react"
import type { ComponentType } from "react"
import type { RaffleStatus } from "@raffle/shared/validators"
import { getStatusLabel } from "@/lib/format"

export type LifecyclePhase = "prep" | "selling" | "closed"

export type LifecycleConfirm =
  | "pause"
  | "unpause"
  | "publish"
  | "finish"
  | "activate"
  | "reactivate"
  | { status: RaffleStatus }

type LifecycleIcon = ComponentType<IconProps>

export type LifecycleAction = {
  id: string
  label: string
  description: string
  icon: LifecycleIcon
  confirm: LifecycleConfirm
  variant?: "default" | "outline" | "destructive"
}

export const RAFFLE_STATUS_HINTS: Record<RaffleStatus, string> = {
  draft: "Borrador: no aparece en la página pública y no se pueden comprar boletos.",
  active: "En venta: los clientes pueden comprar boletos ahora mismo.",
  paused: "Pausada: las ventas están detenidas de forma temporal.",
  finished: "Finalizada: las ventas están cerradas. Puedes publicar resultados cuando tengas ganador.",
  cancelled: "Cancelada: la rifa no acepta compras ni aparece como activa.",
}

export const PHASE_LABELS: Record<LifecyclePhase, string> = {
  prep: "Preparación",
  selling: "En venta",
  closed: "Cerrada",
}

export function getLifecyclePhase(status: RaffleStatus): LifecyclePhase {
  if (status === "draft") return "prep"
  if (status === "active" || status === "paused") return "selling"
  return "closed"
}

export function getStatusHint(status: RaffleStatus, published: boolean): string {
  if (status === "finished" && published) {
    return "Finalizada y publicada: los resultados ya están visibles en el sitio."
  }
  if (status === "finished" && !published) {
    return "Finalizada: cierra el ciclo publicando los resultados cuando estés listo."
  }
  return RAFFLE_STATUS_HINTS[status]
}

export function getPrimaryLifecycleActions(
  status: RaffleStatus,
  published: boolean,
): LifecycleAction[] {
  switch (status) {
    case "draft":
      return [
        {
          id: "activate",
          label: "Activar ventas",
          description: "La rifa quedará disponible para compradores",
          icon: RocketLaunch,
          confirm: "activate",
          variant: "default",
        },
      ]
    case "active":
      return [
        {
          id: "pause",
          label: "Pausar ventas",
          description: "Detiene compras por unos minutos (pausa temporal)",
          icon: Pause,
          confirm: "pause",
          variant: "outline",
        },
        {
          id: "finish",
          label: "Finalizar rifa",
          description: "Cierra las ventas de forma definitiva",
          icon: Flag,
          confirm: "finish",
          variant: "destructive",
        },
      ]
    case "paused":
      return [
        {
          id: "unpause",
          label: "Reanudar ventas",
          description: "Vuelve a permitir compras si hay boletos",
          icon: Play,
          confirm: "unpause",
          variant: "default",
        },
        {
          id: "finish",
          label: "Finalizar rifa",
          description: "Cierra las ventas sin reanudar",
          icon: Flag,
          confirm: "finish",
          variant: "destructive",
        },
      ]
    case "finished":
      if (!published) {
        return [
          {
            id: "publish",
            label: "Publicar resultados",
            description: "Muestra esta rifa en el historial público",
            icon: CheckCircle,
            confirm: "publish",
            variant: "default",
          },
        ]
      }
      return [
        {
          id: "reactivate",
          label: "Reabrir ventas",
          description: "Vuelve a estado activo (uso excepcional)",
          icon: Play,
          confirm: "reactivate",
          variant: "outline",
        },
      ]
    case "cancelled":
      return [
        {
          id: "reactivate",
          label: "Reactivar rifa",
          description: "Restaura como rifa activa",
          icon: Play,
          confirm: "reactivate",
          variant: "default",
        },
      ]
    default:
      return []
  }
}

export type MoreStatusOption = {
  status: RaffleStatus
  label: string
  description: string
  icon: LifecycleIcon
  destructive?: boolean
}

export function getMoreStatusOptions(
  current: RaffleStatus,
): MoreStatusOption[] {
  const options: MoreStatusOption[] = []

  if (current !== "draft") {
    options.push({
      status: "draft",
      label: "Volver a borrador",
      description: "Oculta la rifa y detiene ventas",
      icon: FileDashed,
    })
  }
  if (current !== "active" && current !== "paused") {
    options.push({
      status: "active",
      label: "Marcar como activa",
      description: "Permite compras de inmediato",
      icon: RocketLaunch,
    })
  }
  if (current !== "paused" && current !== "active") {
    options.push({
      status: "paused",
      label: "Marcar como pausada",
      description: "Estado pausado sin temporizador automático",
      icon: Pause,
    })
  }
  if (current !== "finished") {
    options.push({
      status: "finished",
      label: "Marcar como finalizada",
      description: "Cierra ventas sin usar el flujo principal",
      icon: Flag,
    })
  }
  if (current !== "cancelled") {
    options.push({
      status: "cancelled",
      label: "Cancelar rifa",
      description: "La rifa queda fuera de circulación",
      icon: Prohibit,
      destructive: true,
    })
  }

  return options
}

export function getConfirmCopy(
  confirm: LifecycleConfirm,
  raffleName: string,
): { title: string; description: string; confirmLabel: string; destructive?: boolean } {
  if (typeof confirm === "object") {
    const label = getStatusLabel(confirm.status)
    return {
      title: `Cambiar a ${label}`,
      description: `¿Cambiar «${raffleName}» al estado ${label}?`,
      confirmLabel: "Confirmar",
      destructive: confirm.status === "cancelled",
    }
  }

  switch (confirm) {
    case "pause":
      return {
        title: "Pausar ventas",
        description: `«${raffleName}» dejará de aceptar compras temporalmente. Podrás reanudar después.`,
        confirmLabel: "Pausar",
      }
    case "unpause":
      return {
        title: "Reanudar ventas",
        description: `¿Reanudar «${raffleName}»? Si no quedan boletos suficientes, puede finalizarse sola.`,
        confirmLabel: "Reanudar",
      }
    case "publish":
      return {
        title: "Publicar resultados",
        description: `Los resultados de «${raffleName}» serán visibles en la página pública.`,
        confirmLabel: "Publicar",
      }
    case "finish":
      return {
        title: "Finalizar rifa",
        description: `Cierra las ventas de «${raffleName}» de inmediato. Los clientes no podrán comprar más boletos.`,
        confirmLabel: "Finalizar",
        destructive: true,
      }
    case "activate":
      return {
        title: "Activar ventas",
        description: `«${raffleName}» quedará activa y visible para compradores.`,
        confirmLabel: "Activar",
      }
    case "reactivate":
      return {
        title: "Reabrir rifa",
        description: `«${raffleName}» volverá a estado activo. Úsalo solo si necesitas reabrir ventas.`,
        confirmLabel: "Reabrir",
      }
  }
}
