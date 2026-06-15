import type { RaffleStatus } from "@raffle/shared/validators"

const RAFFLE_STATUS_LABELS: Record<RaffleStatus, string> = {
  active: "Activa",
  paused: "Pausada",
  finished: "Finalizada",
  draft: "Borrador",
  cancelled: "Cancelada",
}

export function raffleStatusLabel(status: RaffleStatus | (string & {})) {
  return RAFFLE_STATUS_LABELS[status as RaffleStatus] ?? status
}

export function adminRaffleListScopeLabel(status: string) {
  switch (status) {
    case "active":
      return "activas"
    case "all":
      return "todas (sin canceladas)"
    case "cancelled":
      return "canceladas"
    case "draft":
    case "paused":
    case "finished":
      return `en estado «${raffleStatusLabel(status).toLowerCase()}»`
    default: {
      const _exhaustive: never = status as never
      return `en estado «${_exhaustive}»`
    }
  }
}
