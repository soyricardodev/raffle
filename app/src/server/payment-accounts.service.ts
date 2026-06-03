import { ValidationError } from "@raffle/shared/errors"
import { validatePaymentAccountInput } from "@raffle/shared/payment-methods"
import { CreatePaymentAccountInput, UpdatePaymentAccountInput } from "@raffle/shared/validators"
import * as paymentAccountsRepo from "./repositories/payment-accounts.repository"

export async function listPaymentAccounts(activeOnly?: boolean) {
  return paymentAccountsRepo.listPaymentAccounts({ activeOnly })
}

export async function getPaymentAccount(id: number) {
  const row = await paymentAccountsRepo.findPaymentAccountById(id)
  if (!row) throw new ValidationError("Método de pago no encontrado")
  return row
}

export async function getPaymentAccountUsage(id: number) {
  const row = await paymentAccountsRepo.findPaymentAccountById(id)
  if (!row) throw new ValidationError("Método de pago no encontrado")
  return paymentAccountsRepo.findPaymentAccountUsage(id)
}

export async function createPaymentAccount(raw: unknown) {
  const input = CreatePaymentAccountInput.parse(raw)
  const accountInfo = validatePaymentAccountInput({
    method_type: input.method_type,
    account_info: input.account_info,
  })
  const id = await paymentAccountsRepo.insertPaymentAccount({
    label: input.label,
    methodType: input.method_type,
    accountInfo,
    isActive: input.is_active,
  })
  return { id }
}

export async function updatePaymentAccount(id: number, raw: unknown) {
  const input = UpdatePaymentAccountInput.parse(raw)
  const existing = await paymentAccountsRepo.findPaymentAccountById(id)
  if (!existing) throw new ValidationError("Método de pago no encontrado")

  const methodType = input.method_type ?? existing.method_type
  const accountInfo = input.account_info
    ? validatePaymentAccountInput({
        method_type: methodType,
        account_info: input.account_info,
      })
    : undefined

  await paymentAccountsRepo.updatePaymentAccount(id, {
    label: input.label,
    methodType: input.method_type,
    accountInfo,
    isActive: input.is_active,
  })
  return { id }
}

export async function removePaymentAccount(id: number, options?: { force?: boolean }) {
  const existing = await paymentAccountsRepo.findPaymentAccountById(id)
  if (!existing) throw new ValidationError("Método de pago no encontrado")

  if (options?.force) {
    const usage = await paymentAccountsRepo.findPaymentAccountUsage(id)
    await paymentAccountsRepo.forceDeletePaymentAccount(id)
    return {
      deletedId: id,
      detachedFromRaffleIds: usage.raffles.map((raffle) => raffle.id),
      deactivatedPromotionIds: usage.promotions.map((promotion) => promotion.id),
    }
  }

  const result = await paymentAccountsRepo.deletePaymentAccount(id)
  if (!result.deleted) {
    const raffleLabels = result.raffleIds.map((raffleId) => `#${raffleId}`).join(", ")
    const raffleWord = result.raffleIds.length === 1 ? "la rifa" : `${result.raffleIds.length} rifas`
    throw new ValidationError(
      `No se puede eliminar: este método está asignado a ${raffleWord} (${raffleLabels}). Quítalo de la rifa antes de eliminarlo del catálogo.`,
    )
  }
  return { deletedId: id }
}
