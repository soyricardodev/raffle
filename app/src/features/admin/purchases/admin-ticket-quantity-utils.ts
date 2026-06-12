export type ResolveAdminTicketOperationResult = {
  parsed: number | null
  message: string | null
  canSubmit: boolean
}

const DEFAULT_OPERATION_QUANTITY = "1"

/** Cantidad por defecto para operaciones add/remove (delta, no total de compra). */
export function getDefaultAdminTicketOperationDraft(): string {
  return DEFAULT_OPERATION_QUANTITY
}

export function parseAdminTicketOperationDraft(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

/** Resuelve cantidad de operación desde el borrador (entero positivo, sin tope de stock en UI). */
export function resolveAdminTicketOperation(draft: string): ResolveAdminTicketOperationResult {
  const parsed = parseAdminTicketOperationDraft(draft)

  if (parsed == null) {
    if (draft.trim() !== "") {
      return {
        parsed: null,
        message: "Ingresa una cantidad válida.",
        canSubmit: false,
      }
    }
    return {
      parsed: null,
      message: null,
      canSubmit: false,
    }
  }

  if (parsed < 1) {
    return {
      parsed,
      message: "La cantidad debe ser al menos 1.",
      canSubmit: false,
    }
  }

  return {
    parsed,
    message: null,
    canSubmit: true,
  }
}

/** Remove delta must leave at least one ticket on the purchase. */
export function validateAdminTicketRemoveQuantity(
  quantity: number,
  currentQty: number,
): { message: string | null; canRemove: boolean } {
  if (quantity >= currentQty) {
    if (currentQty <= 1) {
      return {
        message: "No puedes quitar boletos: debe quedar al menos 1.",
        canRemove: false,
      }
    }
    return {
      message: `Solo puedes quitar hasta ${currentQty - 1} boleto(s).`,
      canRemove: false,
    }
  }
  return { message: null, canRemove: true }
}

export function formatAdminTicketOperationHelp(
  operation: "add" | "remove",
  quantity: number,
  currentQty: number,
  estimatedTotal: string | null,
): string {
  const newQty = operation === "add" ? currentQty + quantity : currentQty - quantity
  const action = operation === "add" ? "Agregar" : "Quitar"
  if (operation === "remove" && newQty < 1) {
    const maxRemovable = Math.max(0, currentQty - 1)
    return maxRemovable === 0
      ? "No puedes quitar boletos: debe quedar al menos 1."
      : `Quitar ${quantity} → máximo ${maxRemovable} boleto(s)`
  }
  const totalPart = estimatedTotal != null ? ` · ~${estimatedTotal}` : ""
  return `${action} ${quantity} → ${newQty} boleto(s)${totalPart}`
}

export function formatAdminTicketOperationConfirm(
  operation: "add" | "remove",
  quantity: number,
  currentQty: number,
  estimatedTotal: string | null,
): string {
  const newQty = operation === "add" ? currentQty + quantity : currentQty - quantity
  const verb = operation === "add" ? "agregar" : "quitar"
  if (operation === "remove" && newQty < 1) {
    return `¿Quitar ${quantity} boleto(s)? Debe quedar al menos 1 boleto.`
  }
  const totalPart =
    estimatedTotal != null ? ` Total aprox.: ${estimatedTotal}.` : ""
  return `¿${verb.charAt(0).toUpperCase()}${verb.slice(1)} ${quantity} boleto(s)? De ${currentQty} a ${newQty}.${totalPart}`
}
