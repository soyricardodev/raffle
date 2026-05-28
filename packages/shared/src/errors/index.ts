/**
 * Errors de dominio — Raffle v2
 *
 * Cada error tiene un `code` único (snake_case), un `statusCode` HTTP,
 * y `details` opcionales con datos de depuración (sin PII).
 *
 * Uso en server functions:
 *   throw new InsufficientTicketsError(3, 5)
 * El error handler global mapea AppError → respuesta JSON.
 */

// ─── Base ────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = "AppError"
  }
}

// ─── Rafa ────────────────────────────────────────────────────

export class RaffleNotFoundError extends AppError {
  constructor(raffleId: number | string) {
    super(`Rifa #${raffleId} no encontrada`, 404, "RAFFLE_NOT_FOUND", { raffleId })
    this.name = "RaffleNotFoundError"
  }
}

export class RaffleNotActiveError extends AppError {
  constructor(raffleId: number | string, status?: string) {
    super(
      `La rifa #${raffleId} no está activa${status ? ` (estado: ${status})` : ""}`,
      400,
      "RAFFLE_NOT_ACTIVE",
      { raffleId, status },
    )
    this.name = "RaffleNotActiveError"
  }
}

export class RafflePausedError extends AppError {
  constructor(
    raffleId: number | string,
    public readonly pauseInfo?: {
      pauseUntil?: Date | string | null
      pauseReason?: string | null
      remainingSeconds?: number
      minPurchase?: number
      available?: number
    },
  ) {
    super("La rifa se encuentra en pausa temporalmente", 400, "RAFFLE_PAUSED", {
      raffleId,
      ...pauseInfo,
    })
    this.name = "RafflePausedError"
  }
}

export class RaffleFinishedError extends AppError {
  constructor(raffleId: number | string) {
    super("Esta rifa ya ha finalizado. No se pueden comprar más boletos.", 400, "RAFFLE_FINISHED", {
      raffleId,
    })
    this.name = "RaffleFinishedError"
  }
}

export class RaffleHasPurchasesError extends AppError {
  constructor(raffleId: number | string, purchaseCount: number) {
    super(
      `No se puede eliminar la rifa #${raffleId} porque tiene ${purchaseCount} compras registradas`,
      400,
      "RAFFLE_HAS_PURCHASES",
      { raffleId, purchaseCount },
    )
    this.name = "RaffleHasPurchasesError"
  }
}

export class RaffleInvalidTransitionError extends AppError {
  constructor(
    message: string,
    details?: { raffleId?: number; from?: string; to?: string; intent?: string },
  ) {
    super(message, 400, "RAFFLE_INVALID_TRANSITION", details)
    this.name = "RaffleInvalidTransitionError"
  }
}

// ─── Tickets ─────────────────────────────────────────────────

export class InsufficientTicketsError extends AppError {
  constructor(available: number, requested: number) {
    super(
      `Solo hay ${available} boletos disponibles. No puedes comprar ${requested}.`,
      400,
      "INSUFFICIENT_TICKETS",
      { available, requested },
    )
    this.name = "InsufficientTicketsError"
  }
}

export class ConcurrentPurchaseError extends AppError {
  constructor(unavailableTickets?: string[]) {
    const detail = unavailableTickets?.length
      ? `Boletos ya vendidos: ${unavailableTickets.join(", ")}`
      : "Alguien compró los boletos antes que tú"

    super(`¡Oops! ${detail}. Por favor intenta nuevamente.`, 409, "CONCURRENT_PURCHASE", {
      unavailableTickets,
    })
    this.name = "ConcurrentPurchaseError"
  }
}

export class TicketNotAvailableError extends AppError {
  constructor(ticketNumber: string, raffleId: number | string) {
    super(
      `El boleto ${ticketNumber} ya no está disponible en la rifa #${raffleId}`,
      400,
      "TICKET_NOT_AVAILABLE",
      { ticketNumber, raffleId },
    )
    this.name = "TicketNotAvailableError"
  }
}

// ─── Compras ─────────────────────────────────────────────────

export class PurchaseNotFoundError extends AppError {
  constructor(purchaseId: number | string) {
    super(`Compra #${purchaseId} no encontrada`, 404, "PURCHASE_NOT_FOUND", {
      purchaseId,
    })
    this.name = "PurchaseNotFoundError"
  }
}

export class PaymentReferenceDuplicateError extends AppError {
  constructor(reference: string, raffleId: number | string) {
    super(
      `El número de referencia "${reference}" ya ha sido utilizado para esta rifa`,
      400,
      "PAYMENT_REFERENCE_DUPLICATE",
      { reference, raffleId },
    )
    this.name = "PaymentReferenceDuplicateError"
  }
}

export class PurchaseAlreadyProcessedError extends AppError {
  constructor(purchaseId: number | string, currentStatus: string) {
    super(
      `La compra #${purchaseId} ya está ${currentStatus} y no se puede modificar`,
      400,
      "PURCHASE_ALREADY_PROCESSED",
      { purchaseId, currentStatus },
    )
    this.name = "PurchaseAlreadyProcessedError"
  }
}

export class PurchaseNoTicketsError extends AppError {
  constructor(purchaseId: number | string) {
    super(
      `No se puede aprobar o rechazar una compra sin boletos asignados`,
      400,
      "PURCHASE_NO_TICKETS",
      { purchaseId },
    )
    this.name = "PurchaseNoTicketsError"
  }
}

export class PurchaseRejectedImmutableError extends AppError {
  constructor(purchaseId: number | string) {
    super("No se pueden modificar compras rechazadas", 400, "PURCHASE_REJECTED_IMMUTABLE", {
      purchaseId,
    })
    this.name = "PurchaseRejectedImmutableError"
  }
}

export class InvalidQuantityError extends AppError {
  constructor(min: number, max: number, provided: number) {
    super(`La cantidad debe estar entre ${min} y ${max} boletos`, 400, "INVALID_QUANTITY", {
      min,
      max,
      provided,
    })
    this.name = "InvalidQuantityError"
  }
}

// ─── Validación ──────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message, 400, "VALIDATION_ERROR", { fieldErrors })
    this.name = "ValidationError"
  }
}

// ─── Auth / RBAC ─────────────────────────────────────────────

export class UnauthorizedError extends AppError {
  constructor(message = "Token de acceso requerido") {
    super(message, 401, "UNAUTHORIZED")
    this.name = "UnauthorizedError"
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Credenciales inválidas", 401, "INVALID_CREDENTIALS")
    this.name = "InvalidCredentialsError"
  }
}

export class ForbiddenError extends AppError {
  constructor(requiredRoles?: string[]) {
    super(
      requiredRoles?.length ? `Requiere rol: ${requiredRoles.join(" o ")}` : "Acceso denegado",
      403,
      "FORBIDDEN",
      { requiredRoles },
    )
    this.name = "ForbiddenError"
  }
}

// ─── Config ──────────────────────────────────────────────────

export class ConfigKeyNotFoundError extends AppError {
  constructor(key: string) {
    super(`Configuración "${key}" no encontrada`, 404, "CONFIG_KEY_NOT_FOUND", {
      key,
    })
    this.name = "ConfigKeyNotFoundError"
  }
}

// ─── Upload ──────────────────────────────────────────────────

export class FileTooLargeError extends AppError {
  constructor(maxBytes: number) {
    super(
      `El archivo excede el límite de ${(maxBytes / 1024 / 1024).toFixed(0)} MB`,
      400,
      "FILE_TOO_LARGE",
      { maxBytes },
    )
    this.name = "FileTooLargeError"
  }
}

export class InvalidFileTypeError extends AppError {
  constructor(mimeType: string, allowed: string[]) {
    super(`Tipo de archivo no permitido: ${mimeType}`, 400, "INVALID_FILE_TYPE", {
      mimeType,
      allowed,
    })
    this.name = "InvalidFileTypeError"
  }
}

// ─── Email ───────────────────────────────────────────────────

export class EmailSendError extends AppError {
  constructor(recipient: string, reason: string) {
    super(`Error al enviar email a ${recipient}: ${reason}`, 500, "EMAIL_SEND_ERROR", {
      recipient,
      reason,
    })
    this.name = "EmailSendError"
  }
}

// ─── Rate Limiting ─────────────────────────────────────────────

export class TooManyRequestsError extends AppError {
  constructor(retryAfterSec = 60) {
    super("Demasiadas solicitudes. Intenta de nuevo más tarde.", 429, "TOO_MANY_REQUESTS", {
      retryAfterSec,
    })
    this.name = "TooManyRequestsError"
  }
}

// ─── Genéricos ───────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const msg = id ? `${resource} #${id} no encontrado/a` : `${resource} no encontrado/a`
    super(msg, 404, "NOT_FOUND", { resource, id })
    this.name = "NotFoundError"
  }
}

export class InternalError extends AppError {
  constructor(message = "Error interno del servidor") {
    super(message, 500, "INTERNAL_ERROR")
    this.name = "InternalError"
  }
}
