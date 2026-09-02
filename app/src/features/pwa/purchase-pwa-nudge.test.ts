import { describe, expect, it } from "vitest"
import { resolvePurchasePwaNudge } from "./purchase-pwa-nudge"

describe("resolvePurchasePwaNudge", () => {
  it("hides when the app is installed and avisos are on", () => {
    expect(
      resolvePurchasePwaNudge({
        standalone: true,
        notifyComplete: true,
        canOfferInstall: false,
        canNotifyHere: false,
        needsIosInstall: false,
      }),
    ).toBeNull()
  })

  it("leads with native install after purchase on Android", () => {
    expect(
      resolvePurchasePwaNudge({
        standalone: false,
        notifyComplete: false,
        canOfferInstall: true,
        canNotifyHere: true,
        needsIosInstall: false,
      }),
    ).toBe("install")
  })

  it("shows iPhone steps when install is the only path", () => {
    expect(
      resolvePurchasePwaNudge({
        standalone: false,
        notifyComplete: false,
        canOfferInstall: true,
        canNotifyHere: false,
        needsIosInstall: true,
      }),
    ).toBe("ios-install")
  })

  it("falls back to avisos when install is not available", () => {
    expect(
      resolvePurchasePwaNudge({
        standalone: false,
        notifyComplete: false,
        canOfferInstall: false,
        canNotifyHere: true,
        needsIosInstall: false,
      }),
    ).toBe("notify")
  })
})
