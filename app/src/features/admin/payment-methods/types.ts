import type { PaymentMethod } from "@raffle/shared/validators"

export type AdminPaymentAccount = {
  id: number
  label: string
  method_type: PaymentMethod
  account_info: Record<string, string>
  is_active: boolean
  sort_order: number
}
