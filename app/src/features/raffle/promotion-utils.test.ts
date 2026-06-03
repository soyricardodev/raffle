import { describe, expect, it } from "vitest"
import type { MethodPromotionSummary } from "@/features/raffle/promotion-types"
import {
  buildMethodPromotionBadgeMap,
  formatMethodPromotionBadge,
  formatMethodPromotionHint,
} from "@/features/raffle/promotion-utils"

describe("method promotion labels", () => {
  const promo: MethodPromotionSummary = {
    raffle_payment_method_id: 3,
    name: "Zelle 20%",
    kind: "percentage",
    discount_percent: 20,
    promo_price_bs: null,
    promo_price_usd: null,
    ends_at: null,
  }

  it("formats badge and hint for percentage", () => {
    expect(formatMethodPromotionBadge(promo)).toBe("-20%")
    expect(
      formatMethodPromotionHint(promo, {
        method_type: "zelle",
        label: "Zelle",
      }),
    ).toMatch(/20%.*Zelle/i)
  })

  it("builds badge map from server quotes", () => {
    expect(
      buildMethodPromotionBadgeMap([
        { raffle_payment_method_id: 3, badge: "-20%" },
        { raffle_payment_method_id: 4, badge: null },
      ]),
    ).toEqual({ 3: "-20%" })
  })
})
