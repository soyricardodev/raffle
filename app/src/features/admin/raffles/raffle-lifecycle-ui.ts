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
import type { RaffleStatus, TransitionRaffleInput } from "@raffle/shared/validators"
import type { ComponentType } from "react"
import { getStatusLabel } from "@/lib/format"

export type LifecyclePhase = "prep" | "selling" | "closed"

type LifecycleIcon = ComponentType<IconProps>

export type LifecycleAction = {
  id: string
  label: string
  description: string
  icon: LifecycleIcon
  request: TransitionRaffleInput
  variant?: "default" | "outline" | "destructive"
}

export const RAFFLE_STATUS_HINTS: Record<RaffleStatus, string> = {
  draft: "Borrador: no aparece en la página pública y no se pueden comprar boletos.",
  active: "En venta: los clientes pueden comprar boletos ahora mismo.",
  paused: "Pausada: las ventas están detenidas de forma temporal.",
  finished:
    "Finalizada: las ventas están cerradas. Puedes publicar resultados cuando tengas ganador.",
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
          request: { intent: "activate" },
          variant: "default",
        },
      ]
    case "active":
      return [
        {
          id: "pause",
          label: "Pausar ventas",
          description: "Detiene compras por 15 minutos (pausa temporal)",
          icon: Pause,
          request: { intent: "pause_sales" },
          variant: "outline",
        },
        {
          id: "finish",
          label: "Finalizar rifa",
          description: "Cierra las ventas de forma definitiva",
          icon: Flag,
          request: { intent: "finish" },
          variant: "destructive",
        },
      ]
    case "paused":
      return [
        {
          id: "resume",
          label: "Reanudar ventas",
          description: "Evalúa boletos y reactiva o finaliza automáticamente",
          icon: Play,
          request: { intent: "resume_sales" },
          variant: "default",
        },
        {
          id: "finish",
          label: "Finalizar rifa",
          description: "Cierra las ventas sin reanudar",
          icon: Flag,
          request: { intent: "finish" },
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
            request: { intent: "publish_results" },
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
          request: { intent: "activate" },
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
          request: { intent: "activate" },
          variant: "default",
        },
      ]
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export type MoreStatusOption = {
  status: RaffleStatus
  label: string
  description: string
  icon: LifecycleIcon
  destructive?: boolean
}

const MORE_STATUS_OPTIONS: Array<MoreStatusOption & { when: (current: RaffleStatus) => boolean }> =
  [
    {
      status: "draft",
      label: "Volver a borrador",
      description: "Oculta la rifa y detiene ventas",
      icon: FileDashed,
      when: (c) => c !== "draft",
    },
    {
      status: "active",
      label: "Marcar como activa",
      description: "Solo desde borrador, finalizada o cancelada",
      icon: RocketLaunch,
      when: (c) => c === "draft" || c === "finished" || c === "cancelled",
    },
    {
      status: "paused",
      label: "Marcar como pausada",
      description: "Pausa administrativa con temporizador de 15 min",
      icon: Pause,
      when: (c) => c === "draft" || c === "finished" || c === "cancelled",
    },
    {
      status: "finished",
      label: "Marcar como finalizada",
      description: "Cierra ventas sin usar el flujo principal",
      icon: Flag,
      when: (c) => c !== "finished",
    },
    {
      status: "cancelled",
      label: "Cancelar rifa",
      description: "La rifa queda fuera de circulación",
      icon: Prohibit,
      destructive: true,
      when: (c) => c !== "cancelled",
    },
  ]

export function getMoreStatusOptions(current: RaffleStatus): MoreStatusOption[] {
  return MORE_STATUS_OPTIONS.filter((o) => o.when(current)).map(
    ({ when: _when, ...option }) => option,
  )
}

export function getConfirmCopy(
  request: TransitionRaffleInput,
  raffleName: string,
): { title: string; description: string; confirmLabel: string; destructive?: boolean } {
  switch (request.intent) {
    case "pause_sales":
      return {
        title: "Pausar ventas",
        description: `«${raffleName}» dejará de aceptar compras temporalmente (15 min). Podrás reanudar después.`,
        confirmLabel: "Pausar",
      }
    case "resume_sales":
      return {
        title: "Reanudar ventas",
        description: `¿Reanudar «${raffleName}»? Si no quedan boletos suficientes, puede finalizarse sola.`,
        confirmLabel: "Reanudar",
      }
    case "publish_results":
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
        description: `«${raffleName}» quedará activa y disponible para compradores.`,
        confirmLabel: "Activar",
      }
    case "set_status": {
      const label = getStatusLabel(request.status)
      return {
        title: `Cambiar a ${label}`,
        description: `¿Cambiar «${raffleName}» al estado ${label}?`,
        confirmLabel: "Confirmar",
        destructive: request.status === "cancelled",
      }
    }
    default: {
      const _exhaustive: never = request
      throw _exhaustive
    }
  }
}
