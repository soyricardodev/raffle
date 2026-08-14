/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest"
import {
  markPromoReminderShown,
  promoReminderStorageKey,
  shouldShowPromoReminder,
  wasPromoReminderShown,
} from "@/features/raffle/purchase-form/purchase-success-reminder"

describe("purchase-success-reminder", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("shows reminder when promo active and support not clicked", () => {
    expect(
      shouldShowPromoReminder({
        promoEnabled: true,
        finalizeHref: "https://t.me/yoiberifas",
        supportClicked: false,
        purchaseId: 26,
      }),
    ).toBe(true)
  })

  it("skips reminder after marked shown", () => {
    markPromoReminderShown(26)
    expect(wasPromoReminderShown(26)).toBe(true)
    expect(
      shouldShowPromoReminder({
        promoEnabled: true,
        finalizeHref: "https://t.me/yoiberifas",
        supportClicked: false,
        purchaseId: 26,
      }),
    ).toBe(false)
  })

  it("uses purchase-scoped storage keys", () => {
    expect(promoReminderStorageKey(26)).toBe("ps-promo-remind-26")
  })
})
