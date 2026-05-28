import { getLogger } from "@/lib/logger"
import { withRetryTransaction } from "@/lib/db.server"
import {
  RaffleNotFoundError,
  RaffleNotActiveError,
  RafflePausedError,
  RaffleFinishedError,
  InsufficientTicketsError,
  PurchaseNotFoundError,
  PurchaseNoTicketsError,
  PurchaseRejectedImmutableError,
  InvalidQuantityError,
  ValidationError,
} from "@raffle/shared/errors"
import { type PaymentMethod, type PurchaseStatus } from "@raffle/shared/validators"
import * as pauseService from "./pause.service"
import * as purchasesRepo from "./repositories/purchases.repository"
import * as rafflesRepo from "./repositories/raffles.repository"
import * as ticketsRepo from "./repositories/tickets.repository"
import * as rafflePaymentMethodsRepo from "./repositories/raffle-payment-methods.repository"
import * as customersRepo from "./repositories/customers.repository"
import { formatCustomerCi, parseCustomerCi } from "@raffle/shared/validators/buyer-identity"
import type { CustomerLocationType } from "@raffle/shared/validators"

const logger = getLogger()

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

    if (raffle.status === "finished" || raffle.status === "cancelled") {
      throw new RaffleFinishedError(params.raffleId)
    }

    if (raffle.status === "paused") {
      const info = await pauseService.getPauseInfo(params.raffleId)
      throw new RafflePausedError(params.raffleId, info ?? undefined)
    }

    if (raffle.drawDate && raffle.drawDate <= new Date()) {
      throw new RaffleFinishedError(params.raffleId)
    }

    if (raffle.status !== "active") {
      throw new RaffleNotActiveError(params.raffleId, raffle.status)
    }

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

    const paymentMethod = payMethod.method_type

    await purchasesRepo.assertUniquePaymentReference(
      tx,
      params.raffleId,
      params.paymentReference,
    )

    if (
      raffle.ticketsAvailable < raffle.minPurchase &&
      raffle.autoPauseEnabled
    ) {
      throw new InsufficientTicketsError(raffle.ticketsAvailable, params.ticketQuantity)
    }

    if (raffle.ticketsAvailable < params.ticketQuantity) {
      throw new InsufficientTicketsError(raffle.ticketsAvailable, params.ticketQuantity)
    }

    const pricePerTicket = purchasesRepo.pricePerTicketCents(paymentMethod, raffle)
    const totalAmountCents = pricePerTicket * params.ticketQuantity

    const parsedCi = parseCustomerCi(params.customerCi)
    const customerCiStored = parsedCi
      ? formatCustomerCi(parsedCi.prefix, parsedCi.number)
      : params.customerCi.trim()

    const locationType = params.locationType ?? "venezuela"
    const customerId = await customersRepo.findOrCreateCustomer(tx, {
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerEmail: params.customerEmail,
      customerCi: customerCiStored,
      customerLocation: params.customerLocation,
      locationType,
      venezuelaState: params.venezuelaState,
    })

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
    })

    const ticketNumbers = await ticketsRepo.allocateTicketsToPurchase(tx, {
      raffleId: params.raffleId,
      purchaseId,
      quantity: params.ticketQuantity,
      ticketStatus: "reserved",
      totalTickets: raffle.totalTickets,
      ticketsAvailable: raffle.ticketsAvailable,
    })

    return { purchaseId, ticketNumbers, totalAmount: totalAmountCents / 100 }
  })

  logger.info(
    { purchaseId: result.purchaseId, raffleId: params.raffleId, ticketQuantity: params.ticketQuantity },
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
  notes?: string,
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
  })

  if (outcome.noChange) return outcome

  logger.info({ purchaseId, newStatus: status }, "purchase:status_updated")

  if (outcome.status === "rejected" && outcome.autoPauseEnabled && outcome.pauseReason === "auto_full") {
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

export async function addTicketsToPurchase(purchaseId: number, quantity: number) {
  const result = await withRetryTransaction(async (tx) => {
    const purchase = await purchasesRepo.findPurchaseForUpdate(tx, purchaseId)
    if (!purchase) throw new PurchaseNotFoundError(purchaseId)

    if (purchase.status === "rejected") {
      throw new PurchaseRejectedImmutableError(purchaseId)
    }

    const raffle = await rafflesRepo.findRaffleForUpdate(tx, purchase.raffleId)
    if (!raffle) throw new RaffleNotFoundError(purchase.raffleId)

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

    const pricePerTicket = purchasesRepo.pricePerTicketCents(
      purchase.paymentMethod as PaymentMethod,
      purchase,
    )
    const additional = pricePerTicket * added.length
    const newQty = purchase.ticketQuantity + added.length
    const newTotal = purchase.totalAmountCents + additional

    await purchasesRepo.updatePurchaseTotals(tx, purchaseId, newQty, newTotal)

    return {
      addedTickets: added,
      newQuantity: newQty,
      newTotalAmount: newTotal / 100,
      additionalAmount: additional / 100,
      raffleId: purchase.raffleId,
    }
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

export async function removeTicketsFromPurchase(purchaseId: number, quantity: number) {
  const result = await withRetryTransaction(async (tx) => {
    const purchase = await purchasesRepo.findPurchaseForUpdate(tx, purchaseId)
    if (!purchase) throw new PurchaseNotFoundError(purchaseId)

    if (purchase.status === "rejected") {
      throw new PurchaseRejectedImmutableError(purchaseId)
    }

    if (quantity >= purchase.ticketQuantity) {
      throw new Error("No se pueden eliminar todos los boletos. Debe quedar al menos 1.")
    }

    const ticketNumbers = await ticketsRepo.pickRandomTicketsFromPurchase(tx, purchaseId, quantity)
    if (ticketNumbers.length === 0) {
      throw new Error("No se encontraron boletos para eliminar en esta compra")
    }

    const pricePerTicket = purchasesRepo.pricePerTicketCents(
      purchase.paymentMethod as PaymentMethod,
      purchase,
    )
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

export async function reassignTicketsToPurchase(purchaseId: number) {
  return withRetryTransaction(async (tx) => {
    const purchase = await purchasesRepo.findPurchaseForUpdate(tx, purchaseId)
    if (!purchase || purchase.status !== "rejected") {
      throw new PurchaseNotFoundError(purchaseId)
    }

    const raffle = await rafflesRepo.findRaffleForUpdate(tx, purchase.raffleId)
    if (!raffle) throw new RaffleNotFoundError(purchase.raffleId)

    const qty = purchase.ticketQuantity
    const pricePerTicket = purchasesRepo.pricePerTicketCents(
      purchase.paymentMethod as PaymentMethod,
      purchase,
    )

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

    logger.info({ purchaseId, reassigned: ticketNumbers.length }, "purchase:reassigned")

    return {
      purchaseId,
      ticketNumbers,
      newQuantity: ticketNumbers.length,
      newTotalAmount: newTotal / 100,
    }
  })
}

export type ListAdminPurchasesParams = Parameters<typeof purchasesRepo.listAdminPurchases>[0]

export const listAdminPurchases = purchasesRepo.listAdminPurchases
export const getPurchaseById = purchasesRepo.getPurchaseById
export const getClientPurchases = purchasesRepo.getClientPurchases
