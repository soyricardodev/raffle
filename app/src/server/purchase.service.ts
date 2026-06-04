import {
  ConcurrentPurchaseError,
  InsufficientTicketsError,
  InvalidQuantityError,
  PurchaseNoTicketsError,
  PurchaseNotFoundError,
  PurchaseRejectedImmutableError,
  RaffleNotFoundError,
  ValidationError,
} from "@raffle/shared/errors"
import { resolveEffectiveUnitPrice } from "@raffle/shared/promotions"
import type { CustomerLocationType, PurchaseStatus } from "@raffle/shared/validators"
import { normalizePhone } from "@raffle/shared/db"
import {
  formatCustomerCi,
  parseCustomerCi,
  paymentReferenceValidationMessage,
  resolvePaymentReferenceMinLength,
  type UpdatePurchaseCustomerInput,
} from "@raffle/shared/validators"
import { type WithRetryTransactionOptions, withRetryTransaction } from "@/lib/db.server"
import { getLogger } from "@/lib/logger"
import { recordPurchaseMetric } from "@/lib/purchase-metrics.server"
import { logPurchaseAudit } from "./purchase-audit.server"
import type { PurchaseAdminAudit } from "./purchase-admin.types"
import {
  assertRaffleOpenForAdminTicketChanges,
  assertRaffleOpenForPublicPurchase,
} from "./raffle-sales-policy"
import * as pauseService from "./pause.service"
import * as customersRepo from "./repositories/customers.repository"
import * as purchasesRepo from "./repositories/purchases.repository"
import * as rafflePaymentMethodsRepo from "./repositories/raffle-payment-methods.repository"
import * as rafflePromotionsRepo from "./repositories/raffle-promotions.repository"
import * as rafflesRepo from "./repositories/raffles.repository"
import * as ticketsRepo from "./repositories/tickets.repository"

const logger = getLogger()

const purchaseRetryOptions: WithRetryTransactionOptions = {
  onRetry: ({ attempt, maxAttempts, error }) => {
    recordPurchaseMetric("transaction_retry", {
      attempt,
      maxAttempts,
      code: error instanceof ConcurrentPurchaseError ? "CONCURRENT_PURCHASE" : "SQLITE_BUSY",
    })
  },
}

export interface CreatePurchaseParams {
  raffleId: number
  customerName: string
  customerPhone: string
  customerEmail: string
  customerCi: string
  customerLocation: string
  locationType?: CustomerLocationType
  venezuelaState?: string | null
  rafflePaymentMethodId: number
  paymentReference: string
  ticketQuantity: number
  paymentProofUrl: string
}

export async function createPurchase(params: CreatePurchaseParams) {
  const result = await withRetryTransaction(async (tx) => {
    const raffle = await rafflesRepo.findRaffleForUpdate(tx, params.raffleId)
    if (!raffle) throw new RaffleNotFoundError(params.raffleId)

    const pauseInfo =
      raffle.status === "paused" ? await pauseService.getPauseInfo(params.raffleId) : null
    assertRaffleOpenForPublicPurchase(raffle, params.raffleId, pauseInfo)

    if (params.ticketQuantity < raffle.minPurchase || params.ticketQuantity > raffle.maxPurchase) {
      throw new InvalidQuantityError(raffle.minPurchase, raffle.maxPurchase, params.ticketQuantity)
    }

    const payMethod = await rafflePaymentMethodsRepo.findActiveRafflePaymentMethodById(
      tx,
      params.raffleId,
      params.rafflePaymentMethodId,
    )
    if (!payMethod) {
      throw new ValidationError("El método de pago seleccionado no está disponible para esta rifa")
    }
    if (payMethod.min_tickets != null && params.ticketQuantity < payMethod.min_tickets) {
      throw new ValidationError(
        `Para pagar con este método necesitas comprar al menos ${payMethod.min_tickets} boletos`,
      )
    }

    const referenceMinLength = resolvePaymentReferenceMinLength(payMethod.min_reference_length)
    const referenceError = paymentReferenceValidationMessage(
      params.paymentReference,
      referenceMinLength,
    )
    if (referenceError) {
      throw new ValidationError(referenceError)
    }

    const paymentMethod = payMethod.method_type

    await purchasesRepo.assertUniquePaymentReference(tx, params.raffleId, params.paymentReference)

    if (raffle.ticketsAvailable < raffle.minPurchase && raffle.autoPauseEnabled) {
      throw new InsufficientTicketsError(raffle.ticketsAvailable, params.ticketQuantity)
    }

    if (raffle.ticketsAvailable < params.ticketQuantity) {
      throw new InsufficientTicketsError(raffle.ticketsAvailable, params.ticketQuantity)
    }

    const promotions = await rafflePromotionsRepo.listPromotionsByRaffle(params.raffleId, tx)
    const unitPricing = resolveEffectiveUnitPrice({
      paymentMethod,
      prices: {
        priceBsCents: raffle.priceBsCents,
        priceUsdCents: raffle.priceUsdCents,
      },
      promotions,
      rafflePaymentMethodId: params.rafflePaymentMethodId,
    })
    const totalAmountCents = unitPricing.finalUnitPriceCents * params.ticketQuantity

    const parsedCi = parseCustomerCi(params.customerCi)
    const customerCiStored = parsedCi
      ? formatCustomerCi(parsedCi.prefix, parsedCi.number)
      : params.customerCi.trim()

    const locationType = params.locationType ?? "venezuela"
    const { customerId, isReturningCustomer } = await customersRepo.findOrCreateCustomer(tx, {
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerEmail: params.customerEmail,
      customerCi: customerCiStored,
      customerLocation: params.customerLocation,
      locationType,
      venezuelaState: params.venezuelaState,
    })
    const isFirstPurchase = !isReturningCustomer

    const purchaseId = await purchasesRepo.insertPurchase(tx, {
      raffleId: params.raffleId,
      customerId,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerEmail: params.customerEmail,
      customerCi: customerCiStored,
      customerLocation: params.customerLocation,
      rafflePaymentMethodId: params.rafflePaymentMethodId,
      paymentMethod,
      paymentReference: params.paymentReference,
      paymentProofUrl: params.paymentProofUrl,
      ticketQuantity: params.ticketQuantity,
      totalAmountCents,
      currency: purchasesRepo.purchaseCurrency(paymentMethod),
      promotionId: unitPricing.promotionId,
      originalUnitPriceCents: unitPricing.originalUnitPriceCents,
      discountUnitCents: unitPricing.discountUnitCents,
      finalUnitPriceCents: unitPricing.finalUnitPriceCents,
    })

    const ticketNumbers = await ticketsRepo.allocateTicketsToPurchase(tx, {
      raffleId: params.raffleId,
      purchaseId,
      quantity: params.ticketQuantity,
      ticketStatus: "reserved",
      totalTickets: raffle.totalTickets,
      ticketsAvailable: raffle.ticketsAvailable,
    })

    return {
      purchaseId,
      ticketNumbers,
      totalAmount: totalAmountCents / 100,
      isFirstPurchase,
      customerName: params.customerName.trim(),
      raffleName: raffle.name,
      ticketCount: params.ticketQuantity,
    }
  }, purchaseRetryOptions)

  recordPurchaseMetric("ticket_allocation", {
    raffleId: params.raffleId,
    ticketQuantity: params.ticketQuantity,
  })

  logger.info(
    {
      purchaseId: result.purchaseId,
      raffleId: params.raffleId,
      ticketQuantity: params.ticketQuantity,
    },
    "purchase:created",
  )

  void (async () => {
    try {
      const autoCheck = await pauseService.checkAutoPause(params.raffleId)
      if (autoCheck.needsPause && autoCheck.pauseType) {
        await pauseService.pauseRaffle(params.raffleId, autoCheck.pauseType)
      }
    } catch (err) {
      logger.error({ raffleId: params.raffleId, err }, "purchase:auto_pause_failed")
    }
  })()

  return result
}

export async function updatePurchaseStatus(
  purchaseId: number,
  status: PurchaseStatus,
  notes: string | undefined,
  audit: PurchaseAdminAudit,
) {
  const outcome = await withRetryTransaction(async (tx) => {
    const purchase = await purchasesRepo.findPurchaseForUpdate(tx, purchaseId)
    if (!purchase) throw new PurchaseNotFoundError(purchaseId)

    const currentStatus = purchase.status
    const raffleId = purchase.raffleId

    if (!["pending", "approved", "rejected"].includes(status)) {
      throw new Error(`Estado inválido: ${status}`)
    }

    if (currentStatus === status) {
      return { message: `La compra ya está ${status}`, noChange: true as const, raffleId }
    }

    if (status === "approved" || status === "rejected") {
      const count = await ticketsRepo.countTicketsForPurchase(tx, purchaseId)
      if (count === 0) throw new PurchaseNoTicketsError(purchaseId)
    }

    await purchasesRepo.updatePurchaseStatusRow(tx, purchaseId, status, notes)

    if (status === "approved") {
      await ticketsRepo.markPurchaseTicketsStatus(tx, purchaseId, raffleId, "reserved", "sold")
    } else if (status === "rejected") {
      await ticketsRepo.releasePurchaseTickets(
        tx,
        purchaseId,
        raffleId,
        currentStatus as "pending" | "approved" | "rejected",
      )
    }

    return {
      message: `Compra actualizada: ${currentStatus} → ${status}`,
      status,
      previousStatus: currentStatus,
      raffleId,
      autoPauseEnabled: purchase.autoPauseEnabled,
      pauseReason: purchase.pauseReason,
      noChange: false as const,
    }
  }, purchaseRetryOptions)

  if (outcome.noChange) return outcome

  logPurchaseAudit("status_changed", {
    purchaseId,
    raffleId: outcome.raffleId,
    adminUserId: audit.adminUserId,
    status,
  })
  logger.info({ purchaseId, newStatus: status }, "purchase:status_updated")

  if (
    outcome.status === "rejected" &&
    outcome.autoPauseEnabled &&
    outcome.pauseReason === "auto_full"
  ) {
    const availability = await pauseService.checkTicketAvailability(outcome.raffleId)
    if (availability.available > 0) {
      await pauseService.unpauseRaffle(outcome.raffleId)
    }
  }

  if (status === "approved" || status === "rejected") {
    const { sendPurchaseStatusEmail } = await import("./purchase-notifications")
    void sendPurchaseStatusEmail(purchaseId, status)
  }

  return outcome
}

export async function addTicketsToPurchase(
  purchaseId: number,
  quantity: number,
  audit: PurchaseAdminAudit,
) {
  const result = await withRetryTransaction(async (tx) => {
    const purchase = await purchasesRepo.findPurchaseForUpdate(tx, purchaseId)
    if (!purchase) throw new PurchaseNotFoundError(purchaseId)

    if (purchase.status === "rejected") {
      throw new PurchaseRejectedImmutableError(purchaseId)
    }

    const raffle = await rafflesRepo.findRaffleForUpdate(tx, purchase.raffleId)
    if (!raffle) throw new RaffleNotFoundError(purchase.raffleId)

    assertRaffleOpenForAdminTicketChanges(raffle, purchase.raffleId)

    if (raffle.ticketsAvailable < quantity) {
      throw new InsufficientTicketsError(raffle.ticketsAvailable, quantity)
    }

    const ticketStatus = purchase.status === "approved" ? "sold" : "reserved"
    const added = await ticketsRepo.allocateTicketsToPurchase(tx, {
      raffleId: purchase.raffleId,
      purchaseId,
      quantity,
      ticketStatus,
      totalTickets: raffle.totalTickets,
      ticketsAvailable: raffle.ticketsAvailable,
    })

    const pricePerTicket = purchasesRepo.unitPriceCentsForPurchase(purchase, {
      priceBsCents: purchase.priceBsCents,
      priceUsdCents: purchase.priceUsdCents,
    })
    const additional = pricePerTicket * added.length
    const updatedQty = purchase.ticketQuantity + added.length
    const newTotal = purchase.totalAmountCents + additional

    await purchasesRepo.updatePurchaseTotals(tx, purchaseId, updatedQty, newTotal)

    return {
      addedTickets: added,
      newQuantity: updatedQty,
      newTotalAmount: newTotal / 100,
      additionalAmount: additional / 100,
      raffleId: purchase.raffleId,
    }
  }, purchaseRetryOptions)

  logPurchaseAudit("tickets_added", {
    purchaseId,
    raffleId: result.raffleId,
    adminUserId: audit.adminUserId,
    quantity: result.addedTickets.length,
    ticketNumbers: result.addedTickets,
  })
  logger.info({ purchaseId, added: result.addedTickets.length }, "purchase:tickets_added")

  void (async () => {
    try {
      const autoCheck = await pauseService.checkAutoPause(result.raffleId)
      if (autoCheck.needsPause && autoCheck.pauseType) {
        await pauseService.pauseRaffle(result.raffleId, autoCheck.pauseType)
      }
    } catch (err) {
      logger.error({ raffleId: result.raffleId, err }, "purchase:add_tickets_auto_pause_failed")
    }
  })()

  return result
}

export async function removeTicketsFromPurchase(
  purchaseId: number,
  quantity: number,
  audit: PurchaseAdminAudit,
) {
  const result = await withRetryTransaction(async (tx) => {
    const purchase = await purchasesRepo.findPurchaseForUpdate(tx, purchaseId)
    if (!purchase) throw new PurchaseNotFoundError(purchaseId)

    if (purchase.status === "rejected") {
      throw new PurchaseRejectedImmutableError(purchaseId)
    }

    const raffle = await rafflesRepo.findRaffleForUpdate(tx, purchase.raffleId)
    if (!raffle) throw new RaffleNotFoundError(purchase.raffleId)
    assertRaffleOpenForAdminTicketChanges(raffle, purchase.raffleId)

    if (quantity >= purchase.ticketQuantity) {
      throw new Error("No se pueden eliminar todos los boletos. Debe quedar al menos 1.")
    }

    const ticketNumbers = await ticketsRepo.pickRandomTicketsFromPurchase(tx, purchaseId, quantity)
    if (ticketNumbers.length === 0) {
      throw new Error("No se encontraron boletos para eliminar en esta compra")
    }

    const pricePerTicket = purchasesRepo.unitPriceCentsForPurchase(purchase, {
      priceBsCents: purchase.priceBsCents,
      priceUsdCents: purchase.priceUsdCents,
    })
    const deduction = pricePerTicket * ticketNumbers.length
    const newQty = purchase.ticketQuantity - ticketNumbers.length
    const newTotal = purchase.totalAmountCents - deduction

    await purchasesRepo.updatePurchaseTotals(tx, purchaseId, newQty, newTotal)
    await ticketsRepo.releaseTicketNumbers(
      tx,
      purchaseId,
      purchase.raffleId,
      ticketNumbers,
      purchase.status as "pending" | "approved" | "rejected",
    )

    return {
      removedTickets: ticketNumbers,
      newQuantity: newQty,
      newTotalAmount: newTotal / 100,
      deductedAmount: deduction / 100,
      raffleId: purchase.raffleId,
      autoPauseEnabled: purchase.autoPauseEnabled,
      pauseReason: purchase.pauseReason,
    }
  }, purchaseRetryOptions)

  logPurchaseAudit("tickets_removed", {
    purchaseId,
    raffleId: result.raffleId,
    adminUserId: audit.adminUserId,
    quantity: result.removedTickets.length,
    ticketNumbers: result.removedTickets,
  })
  logger.info({ purchaseId, removed: result.removedTickets.length }, "purchase:tickets_removed")

  if (result.autoPauseEnabled && result.pauseReason === "auto_full") {
    const availability = await pauseService.checkTicketAvailability(result.raffleId)
    if (availability.available > 0) {
      await pauseService.unpauseRaffle(result.raffleId)
    }
  }

  return result
}

function locationContextFromPurchase(customerLocation: string | null): {
  locationType: CustomerLocationType
  venezuelaState: string | null
} {
  const loc = customerLocation?.trim() ?? ""
  if (loc.startsWith("Venezuela,")) {
    const state = loc.slice("Venezuela,".length).trim()
    return { locationType: "venezuela", venezuelaState: state || null }
  }
  if (loc) {
    return { locationType: "other", venezuelaState: null }
  }
  return { locationType: "venezuela", venezuelaState: null }
}

function formatCiForStorage(ci: string): string {
  const parsed = parseCustomerCi(ci)
  if (!parsed) return ci.trim().substring(0, 20)
  return formatCustomerCi(parsed.prefix, parsed.number)
}

export async function updatePurchaseCustomerContact(
  purchaseId: number,
  patch: UpdatePurchaseCustomerInput,
  audit: PurchaseAdminAudit,
) {
  const outcome = await withRetryTransaction(async (tx) => {
    const purchase = await purchasesRepo.findPurchaseForUpdate(tx, purchaseId)
    if (!purchase) throw new PurchaseNotFoundError(purchaseId)

    const nextName = patch.customerName.trim()
    const nextPhone = patch.customerPhone.trim()
    const nextEmail = patch.customerEmail.trim()
    const nextCiStored = formatCiForStorage(patch.customerCi)
    const nextLocation = patch.customerLocation.trim()

    const phoneNorm = normalizePhone(nextPhone)
    const currentName = purchase.customerName.trim()
    const currentEmail = (purchase.customerEmail ?? "").trim()
    const currentLocation = (purchase.customerLocation ?? "").trim()
    const currentCiStored = purchase.customerCi?.trim() || null

    const nameChanged = nextName !== currentName
    const phoneChanged = phoneNorm !== purchase.customerPhoneNormalized
    const emailChanged = nextEmail !== currentEmail
    const ciChanged = nextCiStored !== currentCiStored
    const locationChanged = nextLocation !== currentLocation

    if (!nameChanged && !phoneChanged && !emailChanged && !ciChanged && !locationChanged) {
      return { noChange: true as const, raffleId: purchase.raffleId }
    }

    const { locationType, venezuelaState } = locationContextFromPurchase(nextLocation)
    const { customerId } = await customersRepo.findOrCreateCustomer(tx, {
      customerName: nextName,
      customerPhone: nextPhone,
      customerEmail: nextEmail,
      customerCi: nextCiStored,
      customerLocation: nextLocation,
      locationType,
      venezuelaState,
    })

    await purchasesRepo.updatePurchaseCustomerProfile(tx, purchaseId, {
      customerName: nextName,
      customerPhone: nextPhone,
      customerPhoneNormalized: phoneNorm,
      customerEmail: nextEmail,
      customerCi: nextCiStored,
      customerLocation: nextLocation,
      customerId,
    })

    return {
      noChange: false as const,
      raffleId: purchase.raffleId,
      fieldsChanged: [
        ...(nameChanged ? (["name"] as const) : []),
        ...(phoneChanged ? (["phone"] as const) : []),
        ...(emailChanged ? (["email"] as const) : []),
        ...(ciChanged ? (["ci"] as const) : []),
        ...(locationChanged ? (["location"] as const) : []),
      ],
    }
  }, purchaseRetryOptions)

  if (outcome.noChange) {
    return { message: "Sin cambios", ...outcome }
  }

  logPurchaseAudit("customer_contact_updated", {
    purchaseId,
    raffleId: outcome.raffleId,
    adminUserId: audit.adminUserId,
    fieldsChanged: outcome.fieldsChanged,
  })
  logger.info({ purchaseId, fieldsChanged: outcome.fieldsChanged }, "purchase:customer_contact_updated")

  return { message: "Datos del comprador actualizados" }
}

export async function reassignTicketsToPurchase(
  purchaseId: number,
  audit: PurchaseAdminAudit,
) {
  const result = await withRetryTransaction(async (tx) => {
    const purchase = await purchasesRepo.findPurchaseForUpdate(tx, purchaseId)
    if (!purchase || purchase.status !== "rejected") {
      throw new PurchaseNotFoundError(purchaseId)
    }

    const raffle = await rafflesRepo.findRaffleForUpdate(tx, purchase.raffleId)
    if (!raffle) throw new RaffleNotFoundError(purchase.raffleId)
    assertRaffleOpenForAdminTicketChanges(raffle, purchase.raffleId)

    const qty = purchase.ticketQuantity
    const pricePerTicket = purchasesRepo.unitPriceCentsForPurchase(purchase, {
      priceBsCents: purchase.priceBsCents,
      priceUsdCents: purchase.priceUsdCents,
    })

    const ticketNumbers = await ticketsRepo.allocateTicketsToPurchase(tx, {
      raffleId: purchase.raffleId,
      purchaseId,
      quantity: qty,
      ticketStatus: "reserved",
      totalTickets: raffle.totalTickets,
      ticketsAvailable: raffle.ticketsAvailable,
    })

    const newTotal = pricePerTicket * ticketNumbers.length

    await purchasesRepo.updatePurchaseTotals(tx, purchaseId, ticketNumbers.length, newTotal)
    await purchasesRepo.updatePurchaseStatusRow(tx, purchaseId, "pending")

    return {
      purchaseId,
      ticketNumbers,
      newQuantity: ticketNumbers.length,
      newTotalAmount: newTotal / 100,
      raffleId: purchase.raffleId,
    }
  }, purchaseRetryOptions)

  logPurchaseAudit("tickets_reassigned", {
    purchaseId,
    raffleId: result.raffleId,
    adminUserId: audit.adminUserId,
    quantity: result.ticketNumbers.length,
    ticketNumbers: result.ticketNumbers,
  })
  logger.info({ purchaseId, reassigned: result.ticketNumbers.length }, "purchase:reassigned")
  return result
}

export type ListAdminPurchasesParams = Parameters<typeof purchasesRepo.listAdminPurchases>[0]

export const listAdminPurchases = purchasesRepo.listAdminPurchases
export const getPurchaseById = purchasesRepo.getPurchaseById
export const getClientPurchases = purchasesRepo.getClientPurchases
