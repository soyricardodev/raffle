import { describe, expect, it } from "vitest"
import { pickDefaultPaymentMethodId } from "@/features/raffle/purchase-form/use-payment-method-selection"
import type { RafflePaymentMethod } from "@/features/raffle/types"

function method(
  id: number,
  method_type: RafflePaymentMethod["method_type"],
  min_tickets?: number,
): RafflePaymentMethod {
  return {
    id,
    method_type,
    account_info: {},
    min_tickets: min_tickets ?? null,
    is_active: true,
  }
}

describe("pickDefaultPaymentMethodId", () => {
  it("selects the first eligible method in catalog order", () => {
    const methods = [method(1, "pago_movil"), method(2, "binance"), method(3, "zelle")]
    expect(pickDefaultPaymentMethodId(methods, 1)).toBe(1)
  })

  it("follows a custom catalog order when pago_movil is not first", () => {
    const methods = [method(1, "binance"), method(2, "pago_movil"), method(3, "zelle")]
    expect(pickDefaultPaymentMethodId(methods, 1)).toBe(1)
  })

  it("skips a locked first method", () => {
    const methods = [method(1, "pago_movil", 5), method(2, "binance")]
    expect(pickDefaultPaymentMethodId(methods, 1)).toBe(2)
  })

  it("returns null when nothing is eligible", () => {
    const methods = [method(1, "pago_movil", 10)]
    expect(pickDefaultPaymentMethodId(methods, 1)).toBeNull()
  })

  it("keeps the first eligible method when a later one requires more tickets", () => {
    const methods = [method(1, "pago_movil", 10), method(2, "zelle", 60)]
    expect(pickDefaultPaymentMethodId(methods, 10)).toBe(1)
  })
})
