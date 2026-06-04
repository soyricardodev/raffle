export type AdminTicketTargetBounds = {
  min: number
  max: number
  available: number
}

export type ResolveAdminTicketTargetResult = {
  parsed: number | null
  target: number
  delta: number
  message: string | null
  canSubmit: boolean
  bounds: AdminTicketTargetBounds
}

/** Máximo destino admin: boletos actuales + disponibles en la rifa. */
export function getAdminTicketTargetBounds(
  currentQty: number,
  raffleTicketsAvailable: number,
): AdminTicketTargetBounds {
  const available = Math.max(0, raffleTicketsAvailable)
  const max = Math.max(1, currentQty + available)
  return { min: 1, max, available }
}

export function parseAdminTicketTargetDraft(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

export function formatAdminStockHint(bounds: AdminTicketTargetBounds): string {
  return `${bounds.available} disponibles en la rifa · máx. ${bounds.max} en esta compra`
}

/** Resuelve cantidad destino desde el borrador sin clamp silencioso. */
export function resolveAdminTicketTarget(
  draft: string,
  currentQty: number,
  raffleTicketsAvailable: number,
): ResolveAdminTicketTargetResult {
  const bounds = getAdminTicketTargetBounds(currentQty, raffleTicketsAvailable)
  const parsed = parseAdminTicketTargetDraft(draft)

  if (parsed == null) {
    if (draft.trim() !== "") {
      return {
        parsed: null,
        target: currentQty,
        delta: 0,
        message: "Ingresa una cantidad válida.",
        canSubmit: false,
        bounds,
      }
    }
    return {
      parsed: null,
      target: currentQty,
      delta: 0,
      message: null,
      canSubmit: false,
      bounds,
    }
  }

  if (parsed < bounds.min) {
    return {
      parsed,
      target: currentQty,
      delta: 0,
      message: "La compra debe tener al menos 1 boleto.",
      canSubmit: false,
      bounds,
    }
  }

  if (parsed > bounds.max) {
    const message =
      bounds.available <= 0
        ? "No hay boletos disponibles en la rifa."
        : `Solo puedes agregar hasta ${bounds.available} boleto(s) más (stock disponible).`
    return {
      parsed,
      target: currentQty,
      delta: 0,
      message,
      canSubmit: false,
      bounds,
    }
  }

  const delta = parsed - currentQty
  return {
    parsed,
    target: parsed,
    delta,
    message: null,
    canSubmit: delta !== 0,
    bounds,
  }
}
