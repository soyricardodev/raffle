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

export async function removePaymentAccount(id: number) {
  const result = await paymentAccountsRepo.deletePaymentAccount(id)
  if (!result.deleted) {
    throw new ValidationError("No se puede eliminar: este método está asignado a una o más rifas")
  }
  return { deletedId: id }
}
