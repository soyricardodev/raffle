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
  it("prefers pago_movil when eligible", () => {
    const methods = [method(1, "binance"), method(2, "pago_movil"), method(3, "zelle")]
    expect(pickDefaultPaymentMethodId(methods, 1)).toBe(2)
  })

  it("falls back to first eligible when pago_movil is locked", () => {
    const methods = [method(1, "pago_movil", 5), method(2, "binance")]
    expect(pickDefaultPaymentMethodId(methods, 1)).toBe(2)
  })

  it("returns null when nothing is eligible", () => {
    const methods = [method(1, "pago_movil", 10)]
    expect(pickDefaultPaymentMethodId(methods, 1)).toBeNull()
  })
})
